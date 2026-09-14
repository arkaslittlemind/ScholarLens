"""Root API routes: basic index and liveness/readiness probe."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> dict[str, str]:
    """Basic index route."""
    return {"service": "scholarlens-api", "status": "ok"}


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness/readiness probe used by the platform health check."""
    return {"status": "healthy"}
