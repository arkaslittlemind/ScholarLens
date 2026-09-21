"""Deterministic scoring of agent answers against labeled profiles. No model judge."""

from collections import Counter

from app.agent.agent import CHECKING_OFFICIAL_SOURCES
from app.agent.models import EligibilityResult, EligibilityStatus
from app.evaluation.models import (
    AttemptResult,
    EvaluationProfile,
    FailureCategory,
    RunMetrics,
)
from app.ingestion.documents import slugify

ELIGIBILITY_TARGET = 0.80
CITATION_TARGET = 0.70
HALLUCINATION_LIMIT = 0.10

_ASSERTING_STATUSES = {EligibilityStatus.ELIGIBLE, EligibilityStatus.PARTIAL}


def _contains(haystack_slug: str, needle: str) -> bool:
    # An empty needle would match everything, so it counts as no match.
    needle_slug = slugify(needle)
    return bool(needle_slug) and needle_slug in haystack_slug


def _citation_correct(profile: EvaluationProfile, result: EligibilityResult) -> bool | None:
    if profile.expected_program is None or profile.expected_citation is None:
        return None
    if result.source is None or result.supporting_clause is None:
        return False
    return slugify(result.source.program) == slugify(profile.expected_program) and _contains(
        slugify(result.supporting_clause), profile.expected_citation
    )


def _hallucination_categories(
    result: EligibilityResult, corpus_bodies: list[str]
) -> list[FailureCategory]:
    clause = slugify(result.supporting_clause or "")
    categories: list[FailureCategory] = []
    # A partial verdict that lists what is missing rests on missing information, and
    # EligibilityResult allows it to carry no clause.
    rests_on_missing_info = result.status == EligibilityStatus.PARTIAL and bool(result.missing_info)
    if (
        result.status in _ASSERTING_STATUSES
        and (not clause or result.source is None)
        and not rests_on_missing_info
    ):
        categories.append("missing_citation")
    if clause and not any(clause in slugify(body) for body in corpus_bodies):
        categories.append("ungrounded_clause")
    return categories


def score_attempt(
    profile: EvaluationProfile,
    attempt: int,
    corpus_bodies: list[str],
    result: EligibilityResult | None,
    tool_calls: int | None = None,
    latency_ms: float | None = None,
) -> AttemptResult:
    """Score one agent answer; a `None` result is an engine error."""
    expects_citation = profile.expected_citation is not None
    if result is None:
        return AttemptResult(
            profile_id=profile.profile_id,
            attempt=attempt,
            outcome="engine_error",
            status_correct=False,
            citation_correct=False if expects_citation else None,
            failure_categories=["engine_error"],
        )

    used_web_search = CHECKING_OFFICIAL_SOURCES in result.tool_trace
    status_correct = result.status == profile.expected_status
    citation_correct = _citation_correct(profile, result)
    failures: list[FailureCategory] = []
    if not status_correct:
        failures.append("wrong_status")
    if citation_correct is False:
        failures.append("wrong_citation")

    # Web text cannot be checked against the corpus, so a web-sourced answer is not scored.
    hallucinated: bool | None = None
    if not used_web_search:
        categories = _hallucination_categories(result, corpus_bodies)
        failures.extend(categories)
        hallucinated = bool(categories)

    return AttemptResult(
        profile_id=profile.profile_id,
        attempt=attempt,
        outcome="completed",
        latency_ms=latency_ms,
        tool_calls=tool_calls,
        status=result.status,
        source_program=result.source.program if result.source else None,
        supporting_clause=result.supporting_clause,
        used_web_search=used_web_search,
        status_correct=status_correct,
        citation_correct=citation_correct,
        hallucinated=hallucinated,
        failure_categories=failures,
    )


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _rate(flags: list[bool | None]) -> float | None:
    scored = [flag for flag in flags if flag is not None]
    return sum(scored) / len(scored) if scored else None


def _consistency(attempts: list[AttemptResult], repeats: int) -> float | None:
    if repeats < 2:
        return None
    by_profile: dict[str, list[AttemptResult]] = {}
    for attempt in attempts:
        by_profile.setdefault(attempt.profile_id, []).append(attempt)
    agreeing = sum(
        1
        for group in by_profile.values()
        if all(a.outcome == "completed" for a in group) and len({a.status for a in group}) == 1
    )
    return agreeing / len(by_profile)


def aggregate(attempts: list[AttemptResult], repeats: int) -> RunMetrics:
    completed = [a for a in attempts if a.outcome == "completed"]
    failure_counts = Counter(
        category for attempt in attempts for category in attempt.failure_categories
    )
    return RunMetrics(
        eligibility_accuracy=sum(a.status_correct for a in attempts) / len(attempts),
        citation_accuracy=_rate([a.citation_correct for a in attempts]),
        hallucination_rate=_rate([a.hallucinated for a in attempts]),
        tool_call_count=_mean([a.tool_calls for a in completed if a.tool_calls is not None]),
        latency_ms=_mean([a.latency_ms for a in completed if a.latency_ms is not None]),
        consistency_score=_consistency(attempts, repeats),
        failure_counts=dict(failure_counts),
    )
