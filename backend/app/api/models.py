"""Request models for the public API."""

from pydantic import BaseModel, Field, ValidationInfo, field_validator


class EligibilityRequest(BaseModel):
    description: str = Field(min_length=1, max_length=2000)
    country: str | None = Field(default=None, max_length=100)
    income: float | None = Field(default=None, ge=0)
    # ISO 4217 code. Without it the model would read any income as US dollars.
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    # The state, province, or region within the country.
    state: str | None = Field(default=None, max_length=100)
    gpa: float | None = Field(default=None, ge=0)
    # The top of the grading scale (4, 10, 100 for a percentage), so 8.2 isn't read as out of 4.
    gpa_scale: float | None = Field(default=None, gt=0, le=100)
    major: str | None = Field(default=None, max_length=200)

    # On the scale rather than the model, so a 422 names a field the form can highlight.
    @field_validator("gpa_scale")
    @classmethod
    def _scale_covers_gpa(cls, scale: float | None, info: ValidationInfo) -> float | None:
        gpa = info.data.get("gpa")
        if scale is not None and gpa is not None and gpa > scale:
            raise ValueError("gpa must not exceed gpa_scale")
        return scale
