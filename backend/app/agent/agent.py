"""Pydantic AI ReAct-style eligibility agent: retrieval or web search, then a cited verdict."""

import asyncio
import logging
import os
from dataclasses import dataclass, field
from functools import lru_cache

# Suppress pydantic-ai's startup banner; must be set before pydantic_ai.Agent is imported/used.
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

import httpx2
from pydantic_ai import Agent, InstrumentationSettings, RunContext
from pydantic_ai.capabilities import Instrumentation
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from app.agent.models import EligibilityResult
from app.api.models import EligibilityRequest
from app.config import Settings, get_settings
from app.retrieval.client import DocumentRetriever, RetrievalUnavailableError
from app.telemetry import traced_span
from app.tools.web_search import WebSearchClient, WebSearchUnavailableError

# Stable, user-facing activity labels, feature 11's transparency UI renders these verbatim.
SEARCHING_PROGRAM_RULES = "searching program rules"
CHECKING_OFFICIAL_SOURCES = "checking official sources"
VALIDATING_ELIGIBILITY = "validating eligibility"
PREPARING_CITED_ANSWER = "preparing cited answer"

_logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are ScholarLens, a scholarship and grant eligibility assistant. "
    "For every request, call retrieve_program_rules first to check the "
    "knowledge base. Only call search_the_web when the retrieved context "
    "does not cover the student's question. Never set status to 'eligible' "
    "or 'partial' without a supporting_clause quoted from a retrieved "
    "chunk or web result, and a matching source. If a rule depends on a "
    "student attribute that was not provided, list it in missing_info "
    "instead of guessing."
)


class EligibilityEngineError(Exception):
    """Raised when the agent cannot produce a result: a tool, model, or timeout failure."""


def _log_failure(message: str, exc: Exception) -> None:
    # Only the type: a provider exception's message can echo the prompt or tool query.
    _logger.warning(message, extra={"error_type": type(exc).__name__})


@dataclass
class _Deps:
    retriever: DocumentRetriever
    web_search: WebSearchClient
    trace: list[str] = field(default_factory=list)
    # `trace` dedupes labels, so it cannot say how many times a tool ran.
    tool_calls: int = 0


def _build_agent(settings: Settings) -> Agent[_Deps, EligibilityResult]:
    http_client = httpx2.AsyncClient(timeout=settings.llm_timeout_seconds)
    provider = GoogleProvider(api_key=settings.google_api_key, http_client=http_client)
    model_name = settings.agent_model.removeprefix("google:")
    model = GoogleModel(model_name, provider=provider)

    agent: Agent[_Deps, EligibilityResult] = Agent(
        model,
        deps_type=_Deps,
        output_type=EligibilityResult,
        system_prompt=_SYSTEM_PROMPT,
        # Spans keep model, token usage, and tool names; prompts and tool payloads carry
        # student data, so they stay out of telemetry.
        capabilities=[Instrumentation(settings=InstrumentationSettings(include_content=False))],
    )

    @agent.tool
    async def retrieve_program_rules(ctx: RunContext[_Deps], query: str) -> list[dict]:
        """Search the ScholarLens knowledge base for program rules matching `query`."""
        ctx.deps.tool_calls += 1
        # A repeat call (multi-query retrieval) must not repeat the label in the rendered trace.
        if SEARCHING_PROGRAM_RULES not in ctx.deps.trace:
            ctx.deps.trace.append(SEARCHING_PROGRAM_RULES)
        chunks = await ctx.deps.retriever.retrieve(query)
        return [chunk.model_dump() for chunk in chunks]

    @agent.tool
    async def search_the_web(ctx: RunContext[_Deps], query: str) -> list[dict]:
        """Search the web for official program information matching `query`."""
        ctx.deps.tool_calls += 1
        if CHECKING_OFFICIAL_SOURCES not in ctx.deps.trace:
            ctx.deps.trace.append(CHECKING_OFFICIAL_SOURCES)
        results = await ctx.deps.web_search.search(query)
        return [result.model_dump() for result in results]

    return agent


def _build_prompt(request: EligibilityRequest) -> str:
    parts = [f"Student description: {request.description}"]
    if request.income is not None:
        parts.append(f"Household income: {request.income}")
    if request.state is not None:
        parts.append(f"State: {request.state}")
    if request.gpa is not None:
        parts.append(f"GPA: {request.gpa}")
    if request.major is not None:
        parts.append(f"Major: {request.major}")
    return "\n".join(parts)


class EligibilityAgent:
    """Owns the agent and its tool clients; one instance serves the whole app."""

    def __init__(self, settings: Settings) -> None:
        self._retriever = DocumentRetriever(settings)
        self._web_search = WebSearchClient(settings)
        self._agent = _build_agent(settings)
        self._run_timeout_seconds = settings.agent_run_timeout_seconds

    async def check_eligibility(self, request: EligibilityRequest) -> EligibilityResult:
        result, _ = await self.check_eligibility_measured(request)
        return result

    async def check_eligibility_measured(
        self, request: EligibilityRequest
    ) -> tuple[EligibilityResult, int]:
        """Like `check_eligibility`, plus how many tool calls the run made."""
        deps = _Deps(retriever=self._retriever, web_search=self._web_search)
        try:
            with traced_span("scholarlens.agent.run") as span:
                run_result = await asyncio.wait_for(
                    self._agent.run(_build_prompt(request), deps=deps),
                    timeout=self._run_timeout_seconds,
                )
                span.set_attribute("app.agent.tool_calls", deps.tool_calls)
        except TimeoutError as exc:
            _log_failure("agent run timed out", exc)
            raise EligibilityEngineError("Agent run timed out") from exc
        except (RetrievalUnavailableError, WebSearchUnavailableError) as exc:
            _log_failure("agent tool unavailable", exc)
            raise EligibilityEngineError(str(exc)) from exc
        except Exception as exc:
            _log_failure("agent run failed", exc)
            raise EligibilityEngineError("Agent run failed") from exc

        output = run_result.output
        output.tool_trace = [*deps.trace, VALIDATING_ELIGIBILITY, PREPARING_CITED_ANSWER]
        return output, deps.tool_calls


@lru_cache
def get_agent() -> EligibilityAgent:
    # Missing/invalid credentials fail here (e.g. GoogleProvider raises UserError with no
    # key), before any request runs, that's still an engine-unavailable condition, not a crash.
    try:
        return EligibilityAgent(get_settings())
    except Exception as exc:
        _log_failure("agent construction failed", exc)
        raise EligibilityEngineError("Agent construction failed") from exc
