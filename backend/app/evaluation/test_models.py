import pytest
from pydantic import ValidationError

from app.evaluation.models import EvaluationProfile


def _profile(**overrides: object) -> dict[str, object]:
    return {
        "profile_id": "p1",
        "request": {"description": "Resident of New Jersey"},
        "expected_status": "eligible",
        "expected_program": "NJ STARS",
        "expected_citation": "top 15 percent",
        "category": "clear",
        **overrides,
    }


def test_program_and_citation_together_is_valid():
    assert EvaluationProfile.model_validate(_profile()).expected_program == "NJ STARS"


def test_both_null_is_valid_for_a_missing_info_verdict():
    profile = EvaluationProfile.model_validate(
        _profile(expected_program=None, expected_citation=None, category="missing_info")
    )
    assert profile.expected_citation is None


@pytest.mark.parametrize(
    "overrides", [{"expected_program": None}, {"expected_citation": None}]
)
def test_program_without_citation_or_the_reverse_is_rejected(overrides):
    with pytest.raises(ValidationError):
        EvaluationProfile.model_validate(_profile(**overrides))
