"""Run the labeled profiles through the agent and append the outcome to the run record."""

import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from app.agent.agent import EligibilityAgent, EligibilityEngineError
from app.config import Settings
from app.evaluation.models import AttemptResult, EvaluationProfile, EvaluationRun
from app.evaluation.scoring import aggregate, score_attempt
from app.ingestion.documents import SourceDocument
from app.ingestion.pipeline import IngestionStatus

# A dead engine (bad key, ChromaDB down) fails every attempt for up to the run timeout each,
# so stop early instead of grinding through the whole set.
_MAX_CONSECUTIVE_ENGINE_ERRORS = 3


class EvaluationError(Exception):
    """Raised when a run cannot finish or be recorded. Messages are fixed strings."""


def _ingestion_run_id(path: Path) -> str | None:
    try:
        return IngestionStatus.model_validate_json(path.read_text(encoding="utf-8")).run_id
    except (OSError, ValueError):
        return None


async def _run_attempt(
    agent: EligibilityAgent, profile: EvaluationProfile, attempt: int, corpus_bodies: list[str]
) -> AttemptResult:
    started = time.monotonic()
    try:
        result, tool_calls = await agent.check_eligibility_measured(profile.request)
    except EligibilityEngineError:
        return score_attempt(profile, attempt, corpus_bodies, None)
    latency_ms = (time.monotonic() - started) * 1000
    return score_attempt(profile, attempt, corpus_bodies, result, tool_calls, latency_ms)


def _append_record(path: Path, run: EvaluationRun) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(run.model_dump_json() + "\n")
    except OSError as exc:
        raise EvaluationError("could not write the run record") from exc


async def run_evaluation(
    settings: Settings,
    agent: EligibilityAgent,
    profiles: list[EvaluationProfile],
    documents: list[SourceDocument],
    on_attempt: Callable[[AttemptResult], None] | None = None,
) -> EvaluationRun:
    """Score every profile `evaluation_repeats` times, then append one record for the run.

    Attempts run one at a time to stay inside the model provider's rate limits. Nothing is
    written when the run aborts.
    """
    run_at = datetime.now(UTC).isoformat()
    corpus_bodies = [document.body for document in documents]
    attempts: list[AttemptResult] = []
    consecutive_errors = 0
    for profile in profiles:
        for attempt in range(1, settings.evaluation_repeats + 1):
            scored = await _run_attempt(agent, profile, attempt, corpus_bodies)
            attempts.append(scored)
            if on_attempt is not None:
                on_attempt(scored)
            consecutive_errors = consecutive_errors + 1 if scored.outcome == "engine_error" else 0
            if consecutive_errors >= _MAX_CONSECUTIVE_ENGINE_ERRORS:
                raise EvaluationError("engine unavailable: repeated engine errors, run aborted")

    if all(scored.outcome == "engine_error" for scored in attempts):
        raise EvaluationError("engine unavailable: no attempt completed, run aborted")

    run = EvaluationRun(
        run_id=uuid.uuid4().hex,
        run_at=run_at,
        agent_model=settings.agent_model,
        embedding_model=settings.embedding_model,
        ingestion_run_id=_ingestion_run_id(Path(settings.ingestion_status_path)),
        profile_count=len(profiles),
        repeats=settings.evaluation_repeats,
        attempts=attempts,
        **aggregate(attempts, settings.evaluation_repeats).model_dump(),
    )
    _append_record(Path(settings.evaluation_runs_path), run)
    return run
