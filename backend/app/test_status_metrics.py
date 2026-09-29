import json

import pytest

from app.status_metrics import _read_ingestion, _read_latest_evaluation, _unix_seconds


def test_latest_evaluation_is_the_last_non_blank_line(tmp_path):
    base = {
        "run_at": "2026-09-01T00:00:00+00:00",
        "agent_model": "m",
        "embedding_model": "e",
        "profile_count": 1,
        "repeats": 1,
        "eligibility_accuracy": 0.5,
        "tool_call_count": 1.0,
        "latency_ms": 1.0,
        "failure_counts": {},
        "attempts": [],
    }
    path = tmp_path / "runs.jsonl"
    path.write_text(
        json.dumps({**base, "run_id": "a"}) + "\n" + json.dumps({**base, "run_id": "b"}) + "\n\n",
        encoding="utf-8",
    )
    assert _read_latest_evaluation(path).run_id == "b"


@pytest.mark.parametrize("content", [None, "", "{broken"])
def test_missing_empty_or_malformed_records_publish_nothing(tmp_path, content):
    path = tmp_path / "record"
    if content is not None:
        path.write_text(content, encoding="utf-8")
    assert _read_latest_evaluation(path) is None
    assert _read_ingestion(path) is None


def test_unix_seconds():
    assert _unix_seconds("1970-01-01T00:01:00+00:00") == 60.0
    assert _unix_seconds("not a time") is None
