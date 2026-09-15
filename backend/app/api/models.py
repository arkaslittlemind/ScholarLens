"""Request models for the public API."""

from pydantic import BaseModel, Field


class EligibilityRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    income: float | None = Field(default=None, ge=0)
    state: str | None = Field(default=None, max_length=100)
    gpa: float | None = Field(default=None, ge=0)
    major: str | None = Field(default=None, max_length=200)
