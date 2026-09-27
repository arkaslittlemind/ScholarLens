"""Response models for /ops/summary and the readers for its file-backed sections."""

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.evaluation.models import EvaluationRun
from app.ingestion.pipeline import IngestionStatus

RECENT_RUN_LIMIT = 10

# [unix seconds, value]; None where Prometheus had no value or returned NaN/Inf.
Point = tuple[int, float | None]


class TrafficSeries(BaseModel):
    request_rate: list[Point]
    error_ratio: list[Point]
    latency_p95_ms: list[Point]
    latency_mean_ms: list[Point]
    tool_calls_per_min: dict[str, list[Point]]


class Traffic(BaseModel):
    status: Literal["ok", "not_configured", "unavailable"]
    window_seconds: int
    step_seconds: int
    series: TrafficSeries | None = None


class EvaluationRunSummary(BaseModel):
    """A run without its per-attempt detail, which holds program clause text."""

    run_id: str
    run_at: str
    agent_model: str
    profile_count: int
    repeats: int
    eligibility_accuracy: float
    citation_accuracy: float | None
    hallucination_rate: float | None
    consistency_score: float | None
    tool_call_count: float
    latency_ms: float
    failure_counts: dict[str, int]


class EvaluationSection(BaseModel):
    runs: list[EvaluationRunSummary]


class IngestionSummary(BaseModel):
    """The last ingestion run without its error text, which can carry a provider message."""

    run_id: str
    status: Literal["succeeded", "failed"]
    started_at: str
    finished_at: str
    embedding_model: str
    document_count: int
    chunk_count: int


class OpsSummary(BaseModel):
    generated_at: str
    traffic: Traffic
    evaluation: EvaluationSection
    ingestion: IngestionSummary | None


def read_recent_runs(path: str) -> list[EvaluationRunSummary]:
    """Newest runs first. A malformed line is skipped; a missing file means no runs yet."""
    try:
        # "replace" so one corrupt byte can't fail the whole summary; a line it breaks is skipped.
        lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []
    runs: list[EvaluationRunSummary] = []
    for line in reversed(lines):
        if len(runs) == RECENT_RUN_LIMIT:
            break
        if not line.strip():
            continue
        try:
            run = EvaluationRun.model_validate_json(line)
        except ValidationError:
            continue
        runs.append(EvaluationRunSummary.model_validate(run.model_dump()))
    return runs


def read_ingestion(path: str) -> IngestionSummary | None:
    """None when ingestion never ran or its status file can't be read."""
    try:
        status = IngestionStatus.model_validate_json(Path(path).read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, ValidationError):
        return None
    return IngestionSummary.model_validate(status.model_dump())
