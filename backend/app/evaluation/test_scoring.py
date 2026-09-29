import pytest

from app.agent.agent import CHECKING_OFFICIAL_SOURCES
from app.agent.models import EligibilityResult, EligibilityStatus, Source
from app.evaluation.models import AttemptResult, EvaluationProfile
from app.evaluation.scoring import aggregate, score_attempt

_CORPUS = ["Must rank in the top 15% of your graduating class, measured at the end of the year."]


def _profile(**overrides: object) -> EvaluationProfile:
    return EvaluationProfile.model_validate(
        {
            "profile_id": "p1",
            "request": {"description": "synthetic student"},
            "expected_status": "eligible",
            "expected_program": "NJ STARS",
            "expected_citation": "top 15% of your graduating class",
            "category": "clear",
            **overrides,
        }
    )


def _result(**overrides: object) -> EligibilityResult:
    fields: dict[str, object] = {
        "status": EligibilityStatus.ELIGIBLE,
        "explanation": "Meets the class rank rule.",
        "supporting_clause": "Must rank in the top 15% of your graduating class",
        "source": Source(program="NJ STARS", document="Rules", url="https://example.org"),
        **overrides,
    }
    return EligibilityResult(**fields)


def test_a_correct_grounded_answer_has_no_failures():
    attempt = score_attempt(_profile(), 1, _CORPUS, _result(), tool_calls=2, latency_ms=10.0)

    assert attempt.outcome == "completed"
    assert attempt.status_correct and attempt.citation_correct
    assert attempt.hallucinated is False
    assert attempt.failure_categories == []


def test_an_engine_error_expecting_a_citation_counts_it_wrong():
    attempt = score_attempt(_profile(), 1, _CORPUS, None)
    assert attempt.outcome == "engine_error"
    assert attempt.citation_correct is False
    assert attempt.failure_categories == ["engine_error"]


def test_an_engine_error_on_a_missing_info_profile_leaves_citation_unscored():
    profile = _profile(expected_program=None, expected_citation=None)
    assert score_attempt(profile, 1, _CORPUS, None).citation_correct is None


def test_wrong_status_and_wrong_program_are_both_reported():
    result = _result(
        status=EligibilityStatus.NOT_ELIGIBLE,
        source=Source(program="NJ TAG", document="Rules", url="https://example.org"),
    )
    attempt = score_attempt(_profile(), 1, _CORPUS, result)
    assert attempt.failure_categories == ["wrong_status", "wrong_citation"]


def test_program_names_match_after_slugifying():
    result = _result(source=Source(program="nj  stars", document="d", url="https://e.org"))
    assert score_attempt(_profile(), 1, _CORPUS, result).citation_correct is True


def test_an_asserting_verdict_without_a_clause_is_a_missing_citation():
    attempt = score_attempt(_profile(), 1, _CORPUS, _result(supporting_clause=None))
    assert "missing_citation" in attempt.failure_categories
    assert attempt.hallucinated is True


def test_a_partial_verdict_resting_on_missing_info_needs_no_clause():
    result = _result(
        status=EligibilityStatus.PARTIAL,
        supporting_clause=None,
        source=None,
        missing_info=["class rank"],
    )
    profile = _profile(expected_status="partial", expected_program=None, expected_citation=None)
    attempt = score_attempt(profile, 1, _CORPUS, result)
    assert attempt.hallucinated is False
    assert attempt.failure_categories == []


def test_a_clause_absent_from_the_corpus_is_ungrounded():
    attempt = score_attempt(
        _profile(), 1, _CORPUS, _result(supporting_clause="Must be a millionaire")
    )
    assert "ungrounded_clause" in attempt.failure_categories


def test_a_web_sourced_answer_is_not_scored_for_hallucination():
    result = _result(supporting_clause="Text from the web", tool_trace=[CHECKING_OFFICIAL_SOURCES])
    attempt = score_attempt(_profile(), 1, _CORPUS, result)
    assert attempt.used_web_search is True
    assert attempt.hallucinated is None
    assert "ungrounded_clause" not in attempt.failure_categories


def _attempt(profile_id: str, **fields: object) -> AttemptResult:
    return AttemptResult(profile_id=profile_id, attempt=1, **{"outcome": "completed", **fields})


def test_aggregate_rates_skip_unscored_attempts_and_means_skip_errors():
    attempts = [
        _attempt("a", status="eligible", status_correct=True, citation_correct=True,
                 hallucinated=False, tool_calls=2, latency_ms=100.0),
        _attempt("b", status="eligible", status_correct=False, citation_correct=None,
                 hallucinated=None, tool_calls=4, latency_ms=300.0,
                 failure_categories=["wrong_status"]),
        AttemptResult(profile_id="c", attempt=1, outcome="engine_error", status_correct=False,
                      failure_categories=["engine_error"]),
    ]

    metrics = aggregate(attempts, repeats=1)

    assert metrics.eligibility_accuracy == pytest.approx(1 / 3)
    assert metrics.citation_accuracy == 1.0
    assert metrics.hallucination_rate == 0.0
    assert metrics.tool_call_count == 3.0
    assert metrics.latency_ms == 200.0
    assert metrics.consistency_score is None
    assert metrics.failure_counts == {"wrong_status": 1, "engine_error": 1}


def test_aggregate_rates_are_none_when_nothing_was_scored():
    attempts = [_attempt("a", status="eligible", status_correct=True)]
    metrics = aggregate(attempts, repeats=1)
    assert metrics.citation_accuracy is None and metrics.hallucination_rate is None


def test_consistency_counts_profiles_whose_repeats_all_agree():
    attempts = [
        _attempt("a", status="eligible", status_correct=True),
        _attempt("a", status="eligible", status_correct=True),
        _attempt("b", status="eligible", status_correct=True),
        _attempt("b", status="partial", status_correct=False),
        _attempt("c", status="eligible", status_correct=True),
        AttemptResult(profile_id="c", attempt=2, outcome="engine_error", status_correct=False),
    ]
    assert aggregate(attempts, repeats=2).consistency_score == pytest.approx(1 / 3)
