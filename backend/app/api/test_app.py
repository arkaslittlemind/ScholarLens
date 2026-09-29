import json
import logging
import uuid

from app.api.conftest import ALLOWED_ORIGIN
from app.logging import REQUEST_ID_HEADER, JsonFormatter

_BODY = {"description": "Resident of New Jersey"}


def test_root_and_health(client):
    assert client.get("/").json() == {"service": "scholarlens-api", "status": "ok"}
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "healthy"}


def test_a_request_id_is_generated_when_none_is_sent(client):
    request_id = client.get("/health").headers[REQUEST_ID_HEADER]
    assert uuid.UUID(request_id)


def test_a_safe_request_id_is_echoed(client):
    response = client.get("/health", headers={REQUEST_ID_HEADER: "trace_abc-123"})
    assert response.headers[REQUEST_ID_HEADER] == "trace_abc-123"


def test_an_unsafe_request_id_is_replaced(client):
    response = client.get("/health", headers={REQUEST_ID_HEADER: "bad id;<script>"})
    assert response.headers[REQUEST_ID_HEADER] != "bad id;<script>"
    assert uuid.UUID(response.headers[REQUEST_ID_HEADER])


def test_unknown_path_returns_the_not_found_envelope(client):
    response = client.get("/missing", headers={REQUEST_ID_HEADER: "req-404"})
    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "The requested path does not exist.",
            "fields": [],
        }
    }
    assert response.headers[REQUEST_ID_HEADER] == "req-404"


def test_wrong_method_returns_the_method_not_allowed_envelope(client):
    response = client.get("/eligibility")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_cors_preflight_is_allowed_only_for_the_configured_origin(client):
    preflight = {"Access-Control-Request-Method": "POST"}

    allowed = client.options("/eligibility", headers={"Origin": ALLOWED_ORIGIN, **preflight})
    foreign = client.options(
        "/eligibility", headers={"Origin": "https://evil.example.com", **preflight}
    )

    assert allowed.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "access-control-allow-origin" not in foreign.headers


def test_retry_after_is_exposed_to_the_allowed_origin(client):
    response = client.post("/eligibility", json=_BODY, headers={"Origin": ALLOWED_ORIGIN})
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "retry-after" in response.headers["access-control-expose-headers"].lower()


def test_an_unexpected_error_returns_the_500_envelope_and_logs_no_message(
    client, stub_agent, caplog
):
    # Built at runtime: logged stack frames quote source lines, so a literal would appear there.
    secret = " ".join(["student", "income", "details"])
    stub_agent.error = RuntimeError(secret)

    with caplog.at_level(logging.ERROR, logger="app"):
        response = client.post("/eligibility", json=_BODY, headers={REQUEST_ID_HEADER: "req-500"})

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert response.headers[REQUEST_ID_HEADER] == "req-500"
    assert secret not in response.text

    records = [r for r in caplog.records if r.getMessage() == "unhandled exception"]
    assert len(records) == 1
    logged = json.loads(JsonFormatter().format(records[0]))
    assert logged["error_type"] == "RuntimeError"
    assert secret not in json.dumps(logged)
