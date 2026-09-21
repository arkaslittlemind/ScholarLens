"""`python -m app.evaluation`: score the agent against the labeled student profiles."""

import asyncio
import sys
from pathlib import Path

from pydantic import ValidationError

from app.agent.agent import EligibilityEngineError, get_agent
from app.config import Settings, get_settings
from app.evaluation.models import (
    AttemptResult,
    EvaluationInputError,
    EvaluationProfile,
    EvaluationRun,
)
from app.evaluation.profiles import load_profiles
from app.evaluation.runner import EvaluationError, run_evaluation
from app.evaluation.scoring import CITATION_TARGET, ELIGIBILITY_TARGET, HALLUCINATION_LIMIT
from app.ingestion.documents import IngestionInputError, load_documents


def _percent(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:.1f}%"


def _verdict(met: bool | None) -> str:
    return "not measured" if met is None else "met" if met else "MISSED"


def _print_summary(
    run: EvaluationRun, profiles: list[EvaluationProfile], settings: Settings
) -> None:
    by_id = {profile.profile_id: profile for profile in profiles}
    citation, hallucination = run.citation_accuracy, run.hallucination_rate
    print()
    print(
        f"eligibility accuracy  {_percent(run.eligibility_accuracy)}  "
        f"(target >{ELIGIBILITY_TARGET:.0%})  "
        f"{_verdict(run.eligibility_accuracy > ELIGIBILITY_TARGET)}"
    )
    print(
        f"citation accuracy     {_percent(citation)}  (target >{CITATION_TARGET:.0%})  "
        f"{_verdict(None if citation is None else citation > CITATION_TARGET)}"
    )
    print(
        f"hallucination rate    {_percent(hallucination)}  (target <{HALLUCINATION_LIMIT:.0%})  "
        f"{_verdict(None if hallucination is None else hallucination < HALLUCINATION_LIMIT)}"
    )
    print(f"consistency           {_percent(run.consistency_score)}")
    print(f"mean latency          {run.latency_ms:.0f} ms")
    print(f"mean tool calls       {run.tool_call_count:.2f}")
    print(f"failure categories    {run.failure_counts or 'none'}")

    failing = [attempt for attempt in run.attempts if attempt.failure_categories]
    if failing:
        print("failing attempts:")
    for attempt in failing:
        profile = by_id[attempt.profile_id]
        returned = attempt.status.value if attempt.status else "no answer"
        categories = ", ".join(attempt.failure_categories)
        print(
            f"  {attempt.profile_id} #{attempt.attempt} [{profile.category}]: expected "
            f"{profile.expected_status.value}, got {returned} ({categories})"
        )
    print(f"run {run.run_id} recorded in {settings.evaluation_runs_path}")


def _run(settings: Settings) -> tuple[EvaluationRun, list[EvaluationProfile]]:
    documents = load_documents(Path(settings.ingestion_source_dir))
    profiles = load_profiles(Path(settings.evaluation_profiles_path), documents)
    agent = get_agent()
    total = len(profiles) * settings.evaluation_repeats
    done = 0

    def report(attempt: AttemptResult) -> None:
        nonlocal done
        done += 1
        outcome = ", ".join(attempt.failure_categories) or "ok"
        print(f"[{done}/{total}] {attempt.profile_id} #{attempt.attempt}: {outcome}", flush=True)

    run = asyncio.run(run_evaluation(settings, agent, profiles, documents, on_attempt=report))
    return run, profiles


def main() -> int:
    try:
        settings = get_settings()
    except ValidationError as exc:
        # str(exc) echoes the offending input, so name only the setting.
        print(f"evaluation failed: invalid setting {exc.errors()[0]['loc'][0]}", file=sys.stderr)
        return 1
    try:
        run, profiles = _run(settings)
    except (
        IngestionInputError,
        EvaluationInputError,
        EligibilityEngineError,
        EvaluationError,
    ) as exc:
        print(f"evaluation failed: {exc}", file=sys.stderr)
        return 1
    _print_summary(run, profiles, settings)
    return 0


if __name__ == "__main__":
    sys.exit(main())
