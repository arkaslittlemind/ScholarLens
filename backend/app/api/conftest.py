from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.agent.models import EligibilityResult, EligibilityStatus, Source
from app.api import eligibility
from app.api.models import EligibilityRequest
from app.api.rate_limit import RateLimiter, get_rate_limiter
from app.application import create_app
from app.config import get_settings

ALLOWED_ORIGIN = "https://app.example.com"


def cited_result() -> EligibilityResult:
    return EligibilityResult(
        status=EligibilityStatus.ELIGIBLE,
        summary="Meets the class rank rule.",
        supporting_clause="Must rank in the top 15% of your graduating class.",
        source=Source(program="NJ STARS", document="Rules", url="https://example.org/stars"),
        tool_trace=["searching program rules"],
    )


class StubAgent:
    """Stands in for EligibilityAgent: returns `result`, or raises `error`, and records calls."""

    def __init__(self) -> None:
        self.result = cited_result()
        self.error: Exception | None = None
        self.requests: list[EligibilityRequest] = []

    async def check_eligibility(self, request: EligibilityRequest) -> EligibilityResult:
        self.requests.append(request)
        if self.error is not None:
            raise self.error
        return self.result


@pytest.fixture
def stub_agent() -> StubAgent:
    return StubAgent()


@pytest.fixture
def api_client(
    monkeypatch, make_settings, stub_agent
) -> Callable[..., TestClient]:
    """Build an app from explicit settings, with its cached globals replaced for this test."""

    def build(**overrides: object) -> TestClient:
        settings = make_settings(**{"frontend_origin": ALLOWED_ORIGIN, **overrides})
        app = create_app(settings)
        limiter = RateLimiter(
            per_minute=settings.rate_limit_per_minute,
            per_day=settings.rate_limit_per_day,
            global_per_day=settings.rate_limit_global_per_day,
        )
        app.dependency_overrides[get_settings] = lambda: settings
        app.dependency_overrides[get_rate_limiter] = lambda: limiter
        monkeypatch.setattr(eligibility, "get_agent", lambda: stub_agent)
        # Unexpected errors must come back as the 500 envelope, as a real client would see.
        return TestClient(app, raise_server_exceptions=False)

    return build


@pytest.fixture
def client(api_client) -> TestClient:
    return api_client()
