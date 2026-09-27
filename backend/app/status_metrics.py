"""Gauges for ingestion health and the latest evaluation run, read from their record files.

Kept apart from `app.telemetry` because the ingestion pipeline imports the retrieval client,
which imports `app.telemetry`, so importing `IngestionStatus` there would be a cycle.
"""

from collections.abc import Callable, Iterable
from datetime import datetime
from pathlib import Path
from typing import TypeVar

from opentelemetry import metrics
from opentelemetry.metrics import CallbackOptions, Observation

from app.config import Settings
from app.evaluation.models import EvaluationRun
from app.ingestion.pipeline import IngestionStatus

T = TypeVar("T")

_meter = metrics.get_meter("scholarlens")


def _read_ingestion(path: Path) -> IngestionStatus | None:
    try:
        return IngestionStatus.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _read_latest_evaluation(path: Path) -> EvaluationRun | None:
    try:
        lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return EvaluationRun.model_validate_json(lines[-1]) if lines else None
    except (OSError, ValueError):
        return None


def _unix_seconds(timestamp: str) -> float | None:
    try:
        return datetime.fromisoformat(timestamp).timestamp()
    except ValueError:
        return None


def _gauge(
    name: str,
    unit: str,
    description: str,
    read: Callable[[], T | None],
    value: Callable[[T], float | None],
) -> None:
    # A missing or malformed record, or a null field, publishes no series rather than a
    # made-up zero; dashboards read the absence as "no data yet".
    def callback(_options: CallbackOptions) -> Iterable[Observation]:
        record = read()
        if record is None:
            return []
        observed = value(record)
        return [] if observed is None else [Observation(observed)]

    _meter.create_observable_gauge(name, callbacks=[callback], unit=unit, description=description)


def register_status_gauges(settings: Settings) -> None:
    """Callbacks re-read the files at every collection, so a new run shows up without a restart."""
    ingestion_path = Path(settings.ingestion_status_path)
    evaluation_path = Path(settings.evaluation_runs_path)

    def ingestion() -> IngestionStatus | None:
        return _read_ingestion(ingestion_path)

    def evaluation() -> EvaluationRun | None:
        return _read_latest_evaluation(evaluation_path)

    _gauge(
        "scholarlens.ingestion.last_run_success",
        "1",
        "1 if the last ingestion run succeeded, 0 if it failed.",
        ingestion,
        lambda status: 1.0 if status.status == "succeeded" else 0.0,
    )
    _gauge(
        "scholarlens.ingestion.last_run_timestamp",
        "s",
        "When the last ingestion run finished, as Unix seconds.",
        ingestion,
        lambda status: _unix_seconds(status.finished_at),
    )
    _gauge(
        "scholarlens.ingestion.chunks",
        "{chunk}",
        "Chunks written by the last ingestion run.",
        ingestion,
        lambda status: float(status.chunk_count),
    )
    _gauge(
        "scholarlens.evaluation.eligibility_accuracy",
        "1",
        "Eligibility accuracy of the latest evaluation run.",
        evaluation,
        lambda run: run.eligibility_accuracy,
    )
    _gauge(
        "scholarlens.evaluation.citation_accuracy",
        "1",
        "Citation accuracy of the latest evaluation run.",
        evaluation,
        lambda run: run.citation_accuracy,
    )
    _gauge(
        "scholarlens.evaluation.hallucination_rate",
        "1",
        "Hallucination rate of the latest evaluation run.",
        evaluation,
        lambda run: run.hallucination_rate,
    )
    _gauge(
        "scholarlens.evaluation.consistency_score",
        "1",
        "Consistency across repeats in the latest evaluation run.",
        evaluation,
        lambda run: run.consistency_score,
    )
    _gauge(
        "scholarlens.evaluation.latency",
        "ms",
        "Mean per-attempt latency in the latest evaluation run.",
        evaluation,
        lambda run: run.latency_ms,
    )
    _gauge(
        "scholarlens.evaluation.tool_calls",
        "{call}",
        "Mean tool calls per attempt in the latest evaluation run.",
        evaluation,
        lambda run: run.tool_call_count,
    )
    _gauge(
        "scholarlens.evaluation.last_run_timestamp",
        "s",
        "When the latest evaluation run was recorded, as Unix seconds.",
        evaluation,
        lambda run: _unix_seconds(run.run_at),
    )
