import functools
import json

import httpx
import pytest

_TOKEN = "ops-test-token"
_GRAFANA = {
    "grafana_prometheus_url": "https://prometheus.example.com/api/prom",
    "grafana_prometheus_user": "123456",
    "grafana_prometheus_token": "grafana-test-token",
}


@pytest.fixture
def ops_client(api_client, tmp_path):
    def build(**overrides: object):
        return api_client(
            **{
                "ops_api_token": _TOKEN,
                "evaluation_runs_path": str(tmp_path / "runs.jsonl"),
                "ingestion_status_path": str(tmp_path / "ingestion.json"),
                **overrides,
            }
        )

    return build


@pytest.fixture
def grafana_responds(monkeypatch):
    """Answer every Grafana query with `handler`, so no test reaches Grafana Cloud."""

    def route(handler) -> None:
        real = httpx.AsyncClient
        monkeypatch.setattr(
            httpx, "AsyncClient", functools.partial(real, transport=httpx.MockTransport(handler))
        )

    return route


def _auth(value: str) -> dict[str, str]:
    return {"Authorization": value}


def test_no_configured_token_returns_503(ops_client):
    response = ops_client(ops_api_token=None).get("/ops/summary", headers=_auth(f"Bearer {_TOKEN}"))
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ops_not_configured"


@pytest.mark.parametrize(
    "headers",
    [
        {},
        _auth("Bearer wrong-token"),
        _auth(f"Basic {_TOKEN}"),
        _auth(_TOKEN),
        _auth(f"Bearer {_TOKEN}x"),
    ],
)
def test_a_missing_or_wrong_token_returns_401(ops_client, headers):
    response = ops_client().get("/ops/summary", headers=headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_the_scheme_is_case_insensitive(ops_client):
    assert ops_client().get("/ops/summary", headers=_auth(f"bearer {_TOKEN}")).status_code == 200


def test_the_summary_reads_runs_and_ingestion_and_reports_grafana_unset(ops_client, tmp_path):
    run = {
        "run_id": "r1",
        "run_at": "2026-09-01T00:00:00+00:00",
        "agent_model": "google:test",
        "embedding_model": "test-embedding",
        "profile_count": 3,
        "repeats": 1,
        "eligibility_accuracy": 0.9,
        "tool_call_count": 2.0,
        "latency_ms": 1500.0,
        "failure_counts": {},
        "attempts": [],
    }
    (tmp_path / "runs.jsonl").write_text(json.dumps(run), encoding="utf-8")
    ingestion = {
        "run_id": "i1",
        "status": "failed",
        "started_at": "2026-09-01T00:00:00+00:00",
        "finished_at": "2026-09-01T00:01:00+00:00",
        "collection": "scholarship_programs",
        "embedding_model": "test-embedding",
        "document_count": 10,
        "chunk_count": 0,
        "error": "provider message that must not be served",
    }
    (tmp_path / "ingestion.json").write_text(json.dumps(ingestion), encoding="utf-8")

    response = ops_client().get("/ops/summary", headers=_auth(f"Bearer {_TOKEN}"))

    assert response.status_code == 200
    body = response.json()
    assert [r["run_id"] for r in body["evaluation"]["runs"]] == ["r1"]
    assert body["ingestion"]["status"] == "failed"
    assert "provider message" not in response.text
    assert body["traffic"]["status"] == "not_configured"


def test_no_records_yet_is_an_empty_summary(ops_client):
    body = ops_client().get("/ops/summary", headers=_auth(f"Bearer {_TOKEN}")).json()
    assert body["evaluation"]["runs"] == []
    assert body["ingestion"] is None


def test_a_failing_grafana_degrades_traffic_to_unavailable(ops_client, grafana_responds):
    grafana_responds(lambda _: httpx.Response(502))

    response = ops_client(**_GRAFANA).get("/ops/summary", headers=_auth(f"Bearer {_TOKEN}"))

    assert response.status_code == 200
    assert response.json()["traffic"]["status"] == "unavailable"


def test_a_working_grafana_returns_the_traffic_series(ops_client, grafana_responds):
    requests: list[httpx.Request] = []

    def answer(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        values = [[1_700_000_000, "0.5"]]
        return httpx.Response(
            200, json={"status": "success", "data": {"result": [{"metric": {}, "values": values}]}}
        )

    grafana_responds(answer)

    response = ops_client(**_GRAFANA).get("/ops/summary", headers=_auth(f"Bearer {_TOKEN}"))

    traffic = response.json()["traffic"]
    assert traffic["status"] == "ok"
    assert traffic["series"]["request_rate"] == [[1_700_000_000, 0.5]]
    assert all(r.url.path.endswith("/api/v1/query_range") for r in requests)
    assert all(r.headers["Authorization"].startswith("Basic ") for r in requests)
