"""Eligibility result models, used as the agent's structured output type."""

from enum import StrEnum

from pydantic import BaseModel, Field


class EligibilityStatus(StrEnum):
    ELIGIBLE = "eligible"
    PARTIAL = "partial"
    NOT_ELIGIBLE = "not_eligible"


class Source(BaseModel):
    program: str
    document: str
    url: str


class EligibilityResult(BaseModel):
    status: EligibilityStatus
    explanation: str
    # Null only when the verdict rests on missing information rather than a rule.
    supporting_clause: str | None = None
    source: Source | None = None
    missing_info: list[str] = Field(default_factory=list)
    # User-facing activity labels only, never model reasoning.
    tool_trace: list[str] = Field(default_factory=list)
