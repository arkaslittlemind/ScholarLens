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


@pytest.mark.parametrize(
    "overrides",
    [
        {"country": "x" * 101},
        {"currency": "inr"},
        {"currency": "RUPEES"},
        {"gpa_scale": 0},
        {"gpa_scale": 101},
        {"gpa": 8.2, "gpa_scale": 4},
    ],
)
def test_out_of_bounds_global_fields_are_rejected(overrides):
    with pytest.raises(ValidationError):
        EligibilityRequest(**{"description": "student", **overrides})


def test_a_non_us_profile_with_its_own_units_is_accepted():
    request = EligibilityRequest(
        description="Class 12 student",
        country="India",
        income=400000,
        currency="INR",
        state="Maharashtra",
        gpa=88,
        gpa_scale=100,
    )
    assert (request.currency, request.gpa_scale) == ("INR", 100)


def test_a_gpa_above_its_scale_flags_the_scale_field():
    with pytest.raises(ValidationError) as caught:
        EligibilityRequest(description="student", gpa=8.2, gpa_scale=4)
    assert caught.value.errors()[0]["loc"] == ("gpa_scale",)
