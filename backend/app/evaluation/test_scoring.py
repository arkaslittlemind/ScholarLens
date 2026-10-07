import pytest

from app.agent.agent import CHECKING_OFFICIAL_SOURCES, RunMeasurement
from app.agent.models import Alternative, EligibilityResult, EligibilityStatus, Source
from app.evaluation.models import AttemptResult, EvaluationProfile, EvaluationRun
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
        "summary": "Meets the class rank rule.",
        "supporting_clause": "Must rank in the top 15% of your graduating class",
        "source": Source(program="NJ STARS", document="Rules", url="https://example.org"),
        **overrides,
    }
    return EligibilityResult(**fields)


_MEASUREMENT = RunMeasurement(
    tool_calls=2, model_requests=3, retrieval_ms=400.0, web_search_ms=0.0, first_turn_ms=900.0
)


def test_a_correct_grounded_answer_has_no_failures():
    attempt = score_attempt(_profile(), 1, _CORPUS, _result(), _MEASUREMENT, latency_ms=10.0)

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


def test_an_attempt_keeps_the_run_measurement():
    attempt = score_attempt(_profile(), 1, _CORPUS, _result(), _MEASUREMENT, latency_ms=10.0)

    assert attempt.tool_calls == 2
    assert attempt.model_requests == 3
    assert attempt.retrieval_ms == 400.0
    assert attempt.web_search_ms == 0.0
    assert attempt.first_turn_ms == 900.0


def test_aggregate_splits_latency_by_web_search_and_averages_the_timing():
    attempts = [
        _attempt("a", status="eligible", status_correct=True, latency_ms=4000.0,
                 model_requests=2, retrieval_ms=300.0, web_search_ms=0.0, first_turn_ms=1000.0),
        _attempt("b", status="eligible", status_correct=True, latency_ms=6000.0,
                 model_requests=2, retrieval_ms=500.0, web_search_ms=0.0, first_turn_ms=1400.0),
        _attempt("web-c", status="not_eligible", status_correct=True, latency_ms=12000.0,
                 used_web_search=True, model_requests=3, retrieval_ms=400.0,
                 web_search_ms=2000.0, first_turn_ms=1200.0),
        AttemptResult(profile_id="d", attempt=1, outcome="engine_error", status_correct=False),
    ]

    metrics = aggregate(attempts, repeats=1)

    assert metrics.corpus_latency_ms == 5000.0
    assert metrics.web_latency_ms == 12000.0
    assert metrics.model_requests == pytest.approx(7 / 3)
    assert metrics.retrieval_ms == 400.0
    assert metrics.web_search_ms == 2000.0
    assert metrics.first_turn_ms == 1200.0


def test_aggregate_timing_is_none_for_attempts_recorded_without_it():
    attempts = [_attempt("a", status="eligible", status_correct=True, latency_ms=100.0)]

    metrics = aggregate(attempts, repeats=1)

    assert metrics.corpus_latency_ms == 100.0
    assert metrics.web_latency_ms is None
    assert metrics.model_requests is None
    assert metrics.retrieval_ms is None
    assert metrics.web_search_ms is None
    assert metrics.first_turn_ms is None


def test_a_run_record_written_before_timing_existed_still_parses():
    old = (
        '{"eligibility_accuracy": 0.9, "citation_accuracy": 0.95, "hallucination_rate": 0.0,'
        ' "tool_call_count": 1.0, "latency_ms": 7600.0, "consistency_score": 0.9,'
        ' "failure_counts": {}, "run_id": "r1", "run_at": "2026-10-05T18:38:01Z",'
        ' "agent_model": "google:gemini-3.8-flash", "embedding_model": "gemini-embedding-001",'
        ' "ingestion_run_id": "i1", "profile_count": 1, "repeats": 1, "attempts": [{'
        '"profile_id": "a", "attempt": 1, "outcome": "completed", "latency_ms": 7600.0,'
        ' "tool_calls": 1, "status": "eligible", "status_correct": true}]}'
    )

    run = EvaluationRun.model_validate_json(old)

    assert run.web_latency_ms is None and run.model_requests is None
    assert run.attempts[0].retrieval_ms is None
    assert run.alternatives_dropped is None
    assert run.attempts[0].alternative_count is None
    assert run.attempts[0].alternatives_dropped is None


def test_an_attempt_records_the_alternatives_kept_and_dropped():
    alternative = Alternative(program="NJ TAG", why_it_may_fit="Need based.", source_url="https://e.org")
    measurement = RunMeasurement(
        tool_calls=1, model_requests=2, retrieval_ms=1.0, web_search_ms=0.0, first_turn_ms=1.0,
        alternatives_dropped=2,
    )

    attempt = score_attempt(
        _profile(), 1, _CORPUS, _result(alternatives=[alternative]), measurement
    )

    assert attempt.alternative_count == 1
    assert attempt.alternatives_dropped == 2


def test_an_engine_error_records_no_alternative_counts():
    attempt = score_attempt(_profile(), 1, _CORPUS, None)
    assert attempt.alternative_count is None and attempt.alternatives_dropped is None


def test_aggregate_totals_dropped_alternatives_over_attempts_that_recorded_them():
    attempts = [
        _attempt("a", status="eligible", status_correct=True, alternatives_dropped=2),
        _attempt("b", status="eligible", status_correct=True, alternatives_dropped=0),
        _attempt("c", status="eligible", status_correct=True),
    ]

    assert aggregate(attempts, repeats=1).alternatives_dropped == 2


def test_aggregate_dropped_alternatives_is_none_when_no_attempt_recorded_it():
    attempts = [_attempt("a", status="eligible", status_correct=True)]
    assert aggregate(attempts, repeats=1).alternatives_dropped is None
