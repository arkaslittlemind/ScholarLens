import pytest
from pydantic import ValidationError

from app.api.models import EligibilityRequest


def test_description_only_is_valid():
    request = EligibilityRequest(description="First-year student in New Jersey")
    assert request.income is None and request.state is None


@pytest.mark.parametrize(
    "overrides",
    [
        {"description": ""},
        {"description": "x" * 2001},
        {"income": -1},
        {"gpa": -0.1},
        {"state": "x" * 101},
        {"major": "x" * 201},
    ],
)
def test_out_of_bounds_fields_are_rejected(overrides):
    with pytest.raises(ValidationError):
        EligibilityRequest(**{"description": "student", **overrides})


def test_boundary_values_are_accepted():
    request = EligibilityRequest(
        description="x" * 2000, income=0, gpa=0, state="x" * 100, major="x" * 200
    )
    assert request.income == 0
