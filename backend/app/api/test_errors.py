import pytest

from app.api.errors import _code_for_status


@pytest.mark.parametrize(
    ("status", "code"),
    [
        (400, "bad_request"),
        (404, "not_found"),
        (405, "method_not_allowed"),
        (503, "engine_unavailable"),
        # Unmapped statuses keep the client/server side of the blame.
        (418, "bad_request"),
        (502, "internal_error"),
    ],
)
def test_status_maps_to_a_code(status, code):
    assert _code_for_status(status) == code
