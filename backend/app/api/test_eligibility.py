from app.agent.agent import EligibilityEngineError
from app.api import eligibility

_BODY = {
    "description": "First-year student, top of the class",
    "income": 42000,
    "state": "New Jersey",
    "gpa": 3.6,
    "major": "Biology",
}


def test_a_valid_request_returns_the_agent_result(client, stub_agent):
    response = client.post("/eligibility", json=_BODY)

    assert response.status_code == 200
    assert response.json() == stub_agent.result.model_dump(mode="json")
    assert stub_agent.requests[0].state == "New Jersey"


def test_a_body_failing_validation_names_fields_without_echoing_values(client, stub_agent):
    secret = "private description " + "x" * 2000
    response = client.post("/eligibility", json={"description": secret, "gpa": -1})

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "The request body failed validation.",
            "fields": ["description", "gpa"],
        }
    }
    assert "private description" not in response.text
    assert stub_agent.requests == []


def test_malformed_json_is_a_validation_error(client):
    response = client.post(
        "/eligibility", content=b"{not json", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_a_rejected_body_does_not_spend_rate_limit_quota(api_client):
    client = api_client(rate_limit_per_minute=1)

    assert client.post("/eligibility", json={"description": ""}).status_code == 422
    assert client.post("/eligibility", json=_BODY).status_code == 200


def test_the_limit_returns_429_with_retry_after_and_skips_the_agent(api_client, stub_agent):
    client = api_client(rate_limit_per_minute=2)
    client.post("/eligibility", json=_BODY)
    client.post("/eligibility", json=_BODY)

    response = client.post("/eligibility", json=_BODY)

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
    assert 1 <= int(response.headers["Retry-After"]) <= 60
    assert len(stub_agent.requests) == 2


def test_an_engine_error_returns_503(client, stub_agent):
    stub_agent.error = EligibilityEngineError("Agent run timed out")

    response = client.post("/eligibility", json=_BODY)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "engine_unavailable"
    assert "timed out" not in response.text


def test_an_agent_that_cannot_be_built_returns_503(client, monkeypatch):
    def unavailable():
        raise EligibilityEngineError("Agent construction failed")

    monkeypatch.setattr(eligibility, "get_agent", unavailable)

    response = client.post("/eligibility", json=_BODY)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "engine_unavailable"
