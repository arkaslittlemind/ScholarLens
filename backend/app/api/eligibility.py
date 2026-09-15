"""The public eligibility endpoint."""

from fastapi import APIRouter, HTTPException

from app.agent.models import EligibilityResult
from app.api.errors import ErrorResponse
from app.api.models import EligibilityRequest

router = APIRouter()


@router.post(
    "/eligibility",
    response_model=EligibilityResult,
    # Without these, OpenAPI advertises FastAPI's default error body instead of the envelope.
    responses={
        422: {"model": ErrorResponse, "description": "The request body failed validation."},
        503: {"model": ErrorResponse, "description": "The eligibility engine is not available."},
    },
)
def check_eligibility(request: EligibilityRequest) -> EligibilityResult:
    """Determine which programs a student may qualify for, with the rule behind each result."""
    # The agent that answers this arrives in feature 5; until then the engine is genuinely absent.
    raise HTTPException(status_code=503)
