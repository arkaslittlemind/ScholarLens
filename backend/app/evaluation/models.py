"""Data shapes for the labeled-profile evaluation: profiles, per-attempt results, and runs."""

from typing import Literal, Self

from pydantic import BaseModel, model_validator

from app.agent.models import EligibilityStatus
from app.api.models import EligibilityRequest

ProfileCategory = Literal["clear", "borderline", "missing_info"]
FailureCategory = Literal[
    "engine_error", "wrong_status", "wrong_citation", "missing_citation", "ungrounded_clause"
]


class EvaluationInputError(Exception):
    """Raised when the profile file is missing or malformed. Messages carry ids, never text."""


class EvaluationProfile(BaseModel):
    profile_id: str
    request: EligibilityRequest
    expected_status: EligibilityStatus
    # Both null when the expected verdict rests on missing information, or when the program is
    # outside the corpus (`web-` profiles): web text cannot be checked, so only status is scored.
    expected_program: str | None = None
    expected_citation: str | None = None
    category: ProfileCategory

    @model_validator(mode="after")
    def _program_and_citation_travel_together(self) -> Self:
        if (self.expected_program is None) != (self.expected_citation is None):
            raise ValueError("expected_program and expected_citation must both be set or both null")
        return self


class AttemptResult(BaseModel):
    profile_id: str
    attempt: int
    outcome: Literal["completed", "engine_error"]
    latency_ms: float | None = None
    tool_calls: int | None = None
    # Timing was added after the first runs were recorded, so older records carry none.
    model_requests: int | None = None
    retrieval_ms: float | None = None
    web_search_ms: float | None = None
    first_turn_ms: float | None = None
    # Alternatives shown, and those the server dropped for not linking to a tool-returned URL.
    alternative_count: int | None = None
    alternatives_dropped: int | None = None
    status: EligibilityStatus | None = None
    source_program: str | None = None
    # Kept so a person can review citations by hand.
    supporting_clause: str | None = None
    used_web_search: bool = False
    status_correct: bool
    citation_correct: bool | None = None
    hallucinated: bool | None = None
    failure_categories: list[FailureCategory] = []


class RunMetrics(BaseModel):
    """Rates are fractions from 0 to 1. `tool_call_count` and `latency_ms` are per-attempt means."""

    eligibility_accuracy: float
    citation_accuracy: float | None = None
    hallucination_rate: float | None = None
    tool_call_count: float
    latency_ms: float
    # Mean latency of completed attempts answered without and with web search.
    corpus_latency_ms: float | None = None
    web_latency_ms: float | None = None
    model_requests: float | None = None
    retrieval_ms: float | None = None
    web_search_ms: float | None = None
    first_turn_ms: float | None = None
    # A total, not a mean: any dropped alternative means the prompt let an uncited one through.
    alternatives_dropped: int | None = None
    # Null when each profile ran once, since one attempt cannot disagree with itself.
    consistency_score: float | None = None
    failure_counts: dict[str, int]


class EvaluationRun(RunMetrics):
    run_id: str
    run_at: str
    agent_model: str
    embedding_model: str
    ingestion_run_id: str | None = None
    profile_count: int
    repeats: int
    attempts: list[AttemptResult]
