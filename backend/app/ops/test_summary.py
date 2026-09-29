import json

from app.ops.summary import RECENT_RUN_LIMIT, read_ingestion, read_recent_runs


def _run(run_id: str) -> dict[str, object]:
    return {
        "run_id": run_id,
        "run_at": "2026-09-01T00:00:00+00:00",
        "agent_model": "google:test",
        "embedding_model": "test-embedding",
        "profile_count": 1,
        "repeats": 1,
        "eligibility_accuracy": 1.0,
        "tool_call_count": 1.0,
        "latency_ms": 10.0,
        "failure_counts": {},
        "attempts": [
            {
                "profile_id": "p1",
                "attempt": 1,
                "outcome": "completed",
                "status_correct": True,
                "supporting_clause": "program clause text",
            }
        ],
    }


def _ingestion(**overrides: object) -> dict[str, object]:
    return {
        "run_id": "i1",
        "status": "succeeded",
        "started_at": "2026-09-01T00:00:00+00:00",
        "finished_at": "2026-09-01T00:01:00+00:00",
        "collection": "scholarship_programs",
        "embedding_model": "test-embedding",
        "document_count": 10,
        "chunk_count": 42,
        **overrides,
    }


def test_runs_are_newest_first_and_skip_blank_and_malformed_lines(tmp_path):
    path = tmp_path / "runs.jsonl"
    lines = [json.dumps(_run("old")), "", "{broken", json.dumps(_run("new"))]
    path.write_text("\n".join(lines), encoding="utf-8")

    runs = read_recent_runs(str(path))

    assert [run.run_id for run in runs] == ["new", "old"]
    assert "attempts" not in runs[0].model_dump()


def test_runs_are_capped_to_the_most_recent(tmp_path):
    path = tmp_path / "runs.jsonl"
    count = RECENT_RUN_LIMIT + 3
    path.write_text("\n".join(json.dumps(_run(f"r{i}")) for i in range(count)), "utf-8")

    runs = read_recent_runs(str(path))

    assert len(runs) == RECENT_RUN_LIMIT
    assert runs[0].run_id == f"r{count - 1}"


def test_a_corrupt_byte_does_not_fail_the_other_runs(tmp_path):
    path = tmp_path / "runs.jsonl"
    path.write_bytes(json.dumps(_run("good")).encode() + b"\n\xff\xfe\n")
    assert [run.run_id for run in read_recent_runs(str(path))] == ["good"]


def test_a_missing_runs_file_means_no_runs(tmp_path):
    assert read_recent_runs(str(tmp_path / "missing.jsonl")) == []


def test_ingestion_reads_a_valid_status(tmp_path):
    path = tmp_path / "status.json"
    path.write_text(json.dumps(_ingestion()), encoding="utf-8")
    assert read_ingestion(str(path)).chunk_count == 42


def test_ingestion_is_none_when_missing_or_malformed(tmp_path):
    assert read_ingestion(str(tmp_path / "missing.json")) is None
    path = tmp_path / "status.json"
    path.write_text(json.dumps(_ingestion(status="unknown")), encoding="utf-8")
    assert read_ingestion(str(path)) is None
    path.write_bytes(b"\xff\xfe")
    assert read_ingestion(str(path)) is None
