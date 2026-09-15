"""The public eligibility endpoint."""

from fastapi import APIRouter, HTTPException

from app.agent.models import EligibilityResult
from app.api.models import EligibilityRequest

router = APIRouter()


@router.post("/eligibility", response_model=EligibilityResult)
def check_eligibility(request: EligibilityRequest) -> EligibilityResult:
    """Determine which programs a student may qualify for, with the rule behind each result."""
    # The agent that answers this arrives in feature 5; until then the engine is genuinely absent.
    raise HTTPException(status_code=503)
