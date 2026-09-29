"""The token-protected operations summary read by the /ops page's server side."""

import asyncio
import secrets
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.api.errors import OPS_NOT_CONFIGURED, UNAUTHORIZED, ApiError, ErrorResponse
from app.config import Settings, get_settings, secret_value
from app.ops.prometheus import fetch_traffic
from app.ops.summary import EvaluationSection, OpsSummary, read_ingestion, read_recent_runs

router = APIRouter()

TRAFFIC_WINDOW_SECONDS = 6 * 60 * 60
TRAFFIC_STEP_SECONDS = 300


def require_ops_token(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    expected = secret_value(settings.ops_api_token)
    if not expected:
        raise ApiError(503, OPS_NOT_CONFIGURED)
    scheme, _, presented = (authorization or "").partition(" ")
    # compare_digest so the response time doesn't reveal how much of the token matched.
    if scheme.lower() != "bearer" or not secrets.compare_digest(
        presented.encode(), expected.encode()
    ):
        raise ApiError(401, UNAUTHORIZED, {"WWW-Authenticate": "Bearer"})


@router.get(
    "/ops/summary",
    response_model=OpsSummary,
    dependencies=[Depends(require_ops_token)],
    responses={
        401: {"model": ErrorResponse, "description": "Missing or invalid ops token."},
        503: {"model": ErrorResponse, "description": "The operations view is not configured."},
    },
)
async def ops_summary(settings: Annotated[Settings, Depends(get_settings)]) -> OpsSummary:
    """Traffic trends, recent evaluation runs, and ingestion health for maintainers."""
    runs, ingestion, traffic = await asyncio.gather(
        asyncio.to_thread(read_recent_runs, settings.evaluation_runs_path),
        asyncio.to_thread(read_ingestion, settings.ingestion_status_path),
        fetch_traffic(settings, TRAFFIC_WINDOW_SECONDS, TRAFFIC_STEP_SECONDS),
    )
    return OpsSummary(
        generated_at=datetime.now(UTC).isoformat(),
        traffic=traffic,
        evaluation=EvaluationSection(runs=runs),
        ingestion=ingestion,
    )
