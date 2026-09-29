import asyncio
import logging
import time
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agent import agent as agent_module
from app.agent.agent import (
    CHECKING_OFFICIAL_SOURCES,
    PREPARING_CITED_ANSWER,
    SEARCHING_PROGRAM_RULES,
    VALIDATING_ELIGIBILITY,
    EligibilityAgent,
    EligibilityEngineError,
    EngineBusyError,
    get_agent,
)
from app.agent.test_provider_errors import gemini_429
from app.api import eligibility
from app.api.models import EligibilityRequest
from app.api.rate_limit import RateLimiter, get_rate_limiter
from app.application import create_app
from app.retrieval.client import RetrievalUnavailableError, RetrievedChunk
from app.tools.web_search import WebResult, WebSearchUnavailableError

_CLAUSE = "Must rank in the top 15% of your graduating class."
_ANSWER = {
    "status": "eligible",
    "explanation": "The student ranks in the top 15% of the class.",
    "supporting_clause": _CLAUSE,
    "source": {"program": "NJ STARS", "document": "Rules", "url": "https://example.org/stars"},
    "missing_info": [],
    "tool_trace": ["model-written text that the agent must replace"],
}


class FakeRetriever:
    def __init__(self) -> None:
        self.queries: list[str] = []
        self.error: Exception | None = None

    async def retrieve(self, query: str) -> list[RetrievedChunk]:
        self.queries.append(query)
        if self.error is not None:
            raise self.error
        return [
            RetrievedChunk(
                text=_CLAUSE, program="NJ STARS", document="Rules", url="https://example.org/stars"
            )
        ]


class FakeWebSearch:
    def __init__(self) -> None:
        self.queries: list[str] = []
        self.error: Exception | None = None

    async def search(self, query: str) -> list[WebResult]:
        self.queries.append(query)
        if self.error is not None:
            raise self.error
        return [WebResult(title="Official page", url="https://example.org", snippet="Rule text")]


def scripted(*turns: list[tuple[str, str]]) -> tuple[FunctionModel, list[list[ModelMessage]]]:
    """A model that makes each turn's tool calls in order, then returns `_ANSWER`.

    Also records the message history it saw on every turn.
    """
    seen: list[list[ModelMessage]] = []

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        seen.append(list(messages))
        turn = len(seen) - 1
        if turn < len(turns):
            return ModelResponse(
                parts=[ToolCallPart(tool, {"query": query}) for tool, query in turns[turn]]
            )
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, _ANSWER)])

    return FunctionModel(respond), seen


@pytest.fixture
def tools(monkeypatch) -> tuple[FakeRetriever, FakeWebSearch]:
    retriever, web_search = FakeRetriever(), FakeWebSearch()
    monkeypatch.setattr(agent_module, "DocumentRetriever", lambda _settings: retriever)
    monkeypatch.setattr(agent_module, "WebSearchClient", lambda _settings: web_search)
    return retriever, web_search


@pytest.fixture
def build_agent(make_settings, tools) -> Callable[..., EligibilityAgent]:
    def build(model: FunctionModel, **overrides: object) -> EligibilityAgent:
        # A fake key only lets the Google provider be constructed; the model below replaces it.
        settings = make_settings(**{"google_api_key": "test-key", **overrides})
        agent = EligibilityAgent(settings)
        agent._agent.model = model
        return agent

    return build


def _check(agent: EligibilityAgent, **fields: object):
    request = EligibilityRequest(**{"description": "Senior at a New Jersey high school", **fields})
    return asyncio.run(agent.check_eligibility_measured(request))


def test_a_retrieval_run_returns_the_cited_answer_with_the_rendered_trace(build_agent, tools):
    model, _ = scripted([("retrieve_program_rules", "NJ STARS class rank")])

    result, tool_calls = _check(build_agent(model))

    assert result.status == "eligible"
    assert result.supporting_clause == _CLAUSE
    assert result.source.program == "NJ STARS"
    assert result.tool_trace == [
        SEARCHING_PROGRAM_RULES,
        VALIDATING_ELIGIBILITY,
        PREPARING_CITED_ANSWER,
    ]
    assert tool_calls == 1
    assert tools[0].queries == ["NJ STARS class rank"]


def test_each_label_appears_once_but_every_tool_call_is_counted(build_agent, tools):
    model, _ = scripted(
        [("retrieve_program_rules", "rank"), ("retrieve_program_rules", "residency")],
        [("search_the_web", "NJ STARS official"), ("search_the_web", "HESAA NJ STARS")],
    )

    result, tool_calls = _check(build_agent(model))

    assert result.tool_trace == [
        SEARCHING_PROGRAM_RULES,
        CHECKING_OFFICIAL_SOURCES,
        VALIDATING_ELIGIBILITY,
        PREPARING_CITED_ANSWER,
    ]
    assert tool_calls == 4
    assert tools[1].queries == ["NJ STARS official", "HESAA NJ STARS"]


def test_the_retrieved_chunks_are_returned_to_the_model(build_agent):
    model, seen = scripted([("retrieve_program_rules", "rank")])

    _check(build_agent(model))

    tool_return = seen[1][-1].parts[0]
    assert tool_return.tool_name == "retrieve_program_rules"
    assert tool_return.content[0]["text"] == _CLAUSE


def test_the_prompt_holds_only_the_fields_provided(build_agent):
    model, seen = scripted()

    _check(build_agent(model), gpa=3.6)

    first = seen[0][0]
    assert isinstance(first, ModelRequest)
    prompt = next(p.content for p in first.parts if p.part_kind == "user-prompt")
    assert prompt == "Student description: Senior at a New Jersey high school\nGPA: 3.6"


@pytest.mark.parametrize(
    ("tool", "error"),
    [
        ("retrieve_program_rules", RetrievalUnavailableError("ChromaDB query timed out")),
        ("search_the_web", WebSearchUnavailableError("Tavily search failed")),
    ],
)
def test_an_unavailable_tool_is_an_engine_error(build_agent, tools, caplog, tool, error):
    retriever, web_search = tools
    retriever.error = web_search.error = error
    model, _ = scripted([(tool, "anything")])

    with caplog.at_level(logging.WARNING, logger="app"), pytest.raises(EligibilityEngineError):
        _check(build_agent(model))

    record = next(r for r in caplog.records if r.getMessage() == "agent tool unavailable")
    assert record.error_type == type(error).__name__


def test_a_model_failure_is_an_engine_error_that_logs_only_its_type(build_agent, caplog):
    secret = " ".join(["student", "prompt", "echo"])

    def fail(_messages: list[ModelMessage], _info: AgentInfo) -> ModelResponse:
        raise RuntimeError(secret)

    with caplog.at_level(logging.WARNING, logger="app"), pytest.raises(
        EligibilityEngineError, match="Agent run failed"
    ):
        _check(build_agent(FunctionModel(fail)))

    record = next(r for r in caplog.records if r.getMessage() == "agent run failed")
    assert record.error_type == "RuntimeError"
    assert all(secret not in r.getMessage() for r in caplog.records)


def test_a_run_past_the_timeout_is_an_engine_error(build_agent):
    async def stall(_messages: list[ModelMessage], _info: AgentInfo) -> ModelResponse:
        await asyncio.sleep(5)
        raise AssertionError("the run timeout should have cancelled this call")

    agent = build_agent(FunctionModel(stall), agent_run_timeout_seconds=0.05)

    with pytest.raises(EligibilityEngineError, match="timed out"):
        _check(agent)


def test_get_agent_without_a_google_key_is_an_engine_error(monkeypatch, make_settings):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(agent_module, "get_settings", lambda: make_settings())
    get_agent.cache_clear()
    try:
        with pytest.raises(EligibilityEngineError, match="construction failed"):
            get_agent()
    finally:
        get_agent.cache_clear()


def test_the_full_pipeline_through_the_api(build_agent, make_settings, monkeypatch, tools):
    model, _ = scripted([("retrieve_program_rules", "NJ STARS class rank")])
    agent = build_agent(model)
    settings = make_settings()
    app = create_app(settings)
    app.dependency_overrides[get_rate_limiter] = lambda: RateLimiter(5, 20, 100)
    monkeypatch.setattr(eligibility, "get_agent", lambda: agent)

    response = TestClient(app).post(
        "/eligibility", json={"description": "Senior at a New Jersey high school", "gpa": 3.6}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["supporting_clause"] == _CLAUSE
    assert body["source"]["url"] == "https://example.org/stars"
    assert body["tool_trace"] == [
        SEARCHING_PROGRAM_RULES,
        VALIDATING_ELIGIBILITY,
        PREPARING_CITED_ANSWER,
    ]
    assert tools[0].queries == ["NJ STARS class rank"]


_PER_MINUTE = "GenerateRequestsPerMinutePerProjectPerModel"
_PER_DAY = "GenerateRequestsPerDayPerProjectPerModel-FreeTier"


def rate_limited_first(
    body: dict[str, object], failures: int, then: FunctionModel
) -> tuple[FunctionModel, list[int]]:
    """A model whose first `failures` requests get a Gemini 429, after which `then` answers."""
    calls: list[int] = []

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        calls.append(len(calls) + 1)
        if len(calls) <= failures:
            raise ModelHTTPError(status_code=429, model_name="gemini-test", body=body)
        return then.function(messages, info)

    return FunctionModel(respond), calls


def test_a_short_provider_delay_is_retried_once_and_answers(build_agent):
    answer, _ = scripted()
    model, calls = rate_limited_first(gemini_429(_PER_MINUTE, retry_delay="0.05s"), 1, answer)

    result, tool_calls = _check(build_agent(model))

    assert result.supporting_clause == _CLAUSE
    assert len(calls) == 2
    assert tool_calls == 0


def test_the_answering_attempt_alone_sets_the_trace_and_tool_count(build_agent, tools):
    body = gemini_429(_PER_MINUTE, retry_delay="0.05s")
    turns: list[int] = []

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        turns.append(len(turns))
        if len(turns) == 1:
            return ModelResponse(parts=[ToolCallPart("retrieve_program_rules", {"query": "q"})])
        if len(turns) == 2:
            raise ModelHTTPError(status_code=429, model_name="gemini-test", body=body)
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, _ANSWER)])

    result, tool_calls = _check(build_agent(FunctionModel(respond)))

    # The first attempt searched, then hit the limit; the retry answered without a tool.
    assert tools[0].queries == ["q"]
    assert result.tool_trace == [VALIDATING_ELIGIBILITY, PREPARING_CITED_ANSWER]
    assert tool_calls == 0


def test_a_second_rate_limit_after_the_retry_is_busy(build_agent):
    answer, _ = scripted()
    model, calls = rate_limited_first(gemini_429(_PER_MINUTE, retry_delay="0.05s"), 2, answer)

    with pytest.raises(EngineBusyError) as caught:
        _check(build_agent(model))

    assert len(calls) == 2
    assert caught.value.quota_type == "per_minute"
    assert caught.value.retry_after_seconds == 0.05


@pytest.mark.parametrize(
    ("body", "quota_type", "retry_after"),
    [
        (gemini_429(_PER_DAY, retry_delay="0.05s"), "daily", 0.05),
        # 40 s plus the 20 s model-call window does not fit in the 45 s run budget.
        (gemini_429(_PER_MINUTE, retry_delay="40s"), "per_minute", 40.0),
        (gemini_429(_PER_MINUTE), "per_minute", None),
        ({"error": "not the documented shape"}, "unknown", None),
    ],
)
def test_no_retry_when_the_limit_cannot_clear_in_time(build_agent, body, quota_type, retry_after):
    answer, _ = scripted()
    model, calls = rate_limited_first(body, 1, answer)

    started = time.perf_counter()
    with pytest.raises(EngineBusyError) as caught:
        _check(build_agent(model))

    assert len(calls) == 1
    assert time.perf_counter() - started < 5
    assert caught.value.quota_type == quota_type
    assert caught.value.retry_after_seconds == retry_after


def test_busy_is_still_an_engine_error_for_existing_callers(build_agent):
    answer, _ = scripted()
    model, _ = rate_limited_first(gemini_429(_PER_DAY), 1, answer)

    with pytest.raises(EligibilityEngineError):
        _check(build_agent(model))


def test_the_rate_limit_log_carries_the_quota_type_and_never_the_provider_text(
    build_agent, caplog
):
    answer, _ = scripted()
    model, _ = rate_limited_first(gemini_429(_PER_MINUTE, retry_delay="0.05s"), 2, answer)

    with caplog.at_level(logging.INFO, logger="app"), pytest.raises(EngineBusyError) as caught:
        _check(build_agent(model))

    messages = [r.getMessage() for r in caplog.records]
    assert "agent provider rate limited, retrying" in messages
    record = next(r for r in caplog.records if r.getMessage() == "agent provider rate limited")
    assert record.quota_type == "per_minute"
    assert record.error_type == "ModelHTTPError"
    for r in caplog.records:
        assert "Student prompt text" not in r.getMessage()
        assert "Student prompt text" not in str(vars(r).get("quota_type"))
    assert "Student prompt text" not in str(caught.value)


def test_other_provider_errors_are_still_a_generic_failure(build_agent):
    body = {"error": {"code": 500, "status": "INTERNAL"}}

    def fail(_messages: list[ModelMessage], _info: AgentInfo) -> ModelResponse:
        raise ModelHTTPError(status_code=500, model_name="gemini-test", body=body)

    with pytest.raises(EligibilityEngineError, match="Agent run failed") as caught:
        _check(build_agent(FunctionModel(fail)))
    assert not isinstance(caught.value, EngineBusyError)
