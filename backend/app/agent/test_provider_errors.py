import pytest
from pydantic_ai.exceptions import ModelHTTPError

from app.agent.provider_errors import ProviderRateLimit, classify_rate_limit


def gemini_429(*quota_ids: str, retry_delay: str | None = None) -> dict[str, object]:
    """A synthetic Gemini RESOURCE_EXHAUSTED body in Google's documented error format."""
    details: list[dict[str, object]] = [
        {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            "violations": [
                {
                    "quotaMetric": "generativelanguage.googleapis.com/generate_content_requests",
                    "quotaId": quota_id,
                    "quotaValue": "20",
                }
                for quota_id in quota_ids
            ],
        },
        {"@type": "type.googleapis.com/google.rpc.Help", "links": []},
    ]
    if retry_delay is not None:
        details.append(
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry_delay}
        )
    return {
        "error": {
            "code": 429,
            "message": "You exceeded your current quota. Student prompt text could appear here.",
            "status": "RESOURCE_EXHAUSTED",
            "details": details,
        }
    }


def _error(body: object, status_code: int = 429) -> ModelHTTPError:
    return ModelHTTPError(status_code=status_code, model_name="gemini-test", body=body)


def test_a_per_minute_quota_with_a_delay():
    body = gemini_429("GenerateRequestsPerMinutePerProjectPerModel", retry_delay="31s")
    assert classify_rate_limit(_error(body)) == ProviderRateLimit("per_minute", 31.0)


def test_a_daily_quota_keeps_its_delay_as_a_hint():
    body = gemini_429("GenerateRequestsPerDayPerProjectPerModel-FreeTier", retry_delay="43200s")
    assert classify_rate_limit(_error(body)) == ProviderRateLimit("daily", 43200.0)


def test_daily_outranks_per_minute_when_both_are_violated():
    body = gemini_429(
        "GenerateRequestsPerMinutePerProjectPerModel",
        "GenerateRequestsPerDayPerProjectPerModel",
        retry_delay="5s",
    )
    assert classify_rate_limit(_error(body)).quota_type == "daily"


def test_a_fractional_delay():
    body = gemini_429("GenerateRequestsPerMinutePerProjectPerModel", retry_delay="1.5s")
    assert classify_rate_limit(_error(body)).retry_after_seconds == 1.5


def test_an_unrecognised_quota_id_is_unknown():
    body = gemini_429("InputTokensPerProjectPerModel", retry_delay="10s")
    assert classify_rate_limit(_error(body)) == ProviderRateLimit("unknown", 10.0)


@pytest.mark.parametrize(
    "body",
    [
        None,
        "rate limited",
        {},
        {"error": "RESOURCE_EXHAUSTED"},
        {"error": {"details": "not a list"}},
        {"error": {"details": [None, 3, {"@type": "type.googleapis.com/google.rpc.QuotaFailure"}]}},
        {"error": {"details": [{"@type": "type.googleapis.com/google.rpc.QuotaFailure",
                                "violations": [{"quotaId": 7}, "x"]}]}},
    ],
)
def test_a_malformed_body_is_still_a_rate_limit_with_nothing_known(body):
    assert classify_rate_limit(_error(body)) == ProviderRateLimit("unknown", None)


@pytest.mark.parametrize("delay", ["", "31", "31 s", "-5s", "0s", "soon", "1e3s"])
def test_a_malformed_or_non_positive_delay_is_ignored(delay):
    body = gemini_429("GenerateRequestsPerMinutePerProjectPerModel", retry_delay=delay)
    assert classify_rate_limit(_error(body)).retry_after_seconds is None


@pytest.mark.parametrize("status_code", [400, 500, 503])
def test_other_provider_statuses_are_not_rate_limits(status_code):
    body = gemini_429("GenerateRequestsPerMinutePerProjectPerModel", retry_delay="31s")
    assert classify_rate_limit(_error(body, status_code)) is None


def test_an_unrelated_exception_is_not_a_rate_limit():
    assert classify_rate_limit(RuntimeError("429 Too Many Requests")) is None
