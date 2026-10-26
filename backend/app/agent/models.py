"""Eligibility result models, used as the agent's structured output type."""

from enum import StrEnum

from pydantic import BaseModel, Field


class EligibilityStatus(StrEnum):
    ELIGIBLE = "eligible"
    PARTIAL = "partial"
    NOT_ELIGIBLE = "not_eligible"


class SourceOrigin(StrEnum):
    KNOWLEDGE_BASE = "knowledge_base"
    WEB = "web"


class Source(BaseModel):
    program: str
    document: str
    url: str


class Alternative(BaseModel):
    program: str
    why_it_may_fit: str
    # Kept only when a tool returned this URL in the same run, so it is a source, not a guess.
    source_url: str


class EligibilityResult(BaseModel):
    status: EligibilityStatus
    summary: str
    reasons: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    alternatives: list[Alternative] = Field(default_factory=list)
    # Null only when the verdict rests on missing information rather than a rule.
    supporting_clause: str | None = None
    source: Source | None = None
    # Set by the server from the tool that returned source.url, never by the model.
    source_origin: SourceOrigin | None = None
    missing_info: list[str] = Field(default_factory=list)
    # User-facing activity labels only, never model reasoning.
    tool_trace: list[str] = Field(default_factory=list)
