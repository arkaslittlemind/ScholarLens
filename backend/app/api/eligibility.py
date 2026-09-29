"""The public eligibility endpoint."""

import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.agent import EligibilityEngineError, EngineBusyError, get_agent
from app.agent.models import EligibilityResult
from app.api.errors import ENGINE_BUSY, RATE_LIMITED, ApiError, ErrorResponse
from app.api.models import EligibilityRequest
from app.api.rate_limit import RateLimiter, get_rate_limiter

router = APIRouter()


@router.post(
    "/eligibility",
    response_model=EligibilityResult,
    # Without these, OpenAPI advertises FastAPI's default error body instead of the envelope.
    responses={
        422: {"model": ErrorResponse, "description": "The request body failed validation."},
        429: {
            "model": ErrorResponse,
            "description": "Too many eligibility checks; Retry-After gives the wait in seconds.",
        },
        503: {
            "model": ErrorResponse,
            "description": (
                "engine_unavailable: the eligibility engine is not available. engine_busy: the "
                "model provider is rate limiting; Retry-After gives its suggested wait when known."
            ),
        },
    },
)
async def check_eligibility(
    request: EligibilityRequest,
    http_request: Request,
    limiter: Annotated[RateLimiter, Depends(get_rate_limiter)],
) -> EligibilityResult:
    """Determine which programs a student may qualify for, with the rule behind each result."""
    # Checked here rather than in a dependency so a body that fails validation costs no quota.
    # The host is already the proxy-resolved client when uvicorn trusts the forwarding proxy.
    client_key = http_request.client.host if http_request.client else "unknown"
    retry_after = limiter.acquire(client_key)
    if retry_after is not None:
        raise ApiError(429, RATE_LIMITED, {"Retry-After": str(retry_after)})
    try:
        return await get_agent().check_eligibility(request)
    except EngineBusyError as exc:
        headers = None
        if exc.retry_after_seconds is not None:
            # Whole seconds, rounded up, so the client never retries before the provider allows.
            headers = {"Retry-After": str(max(1, math.ceil(exc.retry_after_seconds)))}
        raise ApiError(503, ENGINE_BUSY, headers) from exc
    except EligibilityEngineError as exc:
        raise HTTPException(status_code=503) from exc
