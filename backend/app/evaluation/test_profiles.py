import json
from pathlib import Path

import pytest

from app.evaluation.models import EvaluationInputError
from app.evaluation.profiles import load_profiles
from app.ingestion.documents import SourceDocument, load_documents

_DATA = Path(__file__).resolve().parents[2] / "data"

_DOCUMENTS = [
    SourceDocument(
        document_id="stars",
        source_id="nj-stars",
        program="NJ STARS",
        document="Rules",
        url="https://example.org",
        body="Must rank in the top 15% of your graduating class.",
    )
]

_SECRET_TEXT = "private student description"


def _profile(**overrides: object) -> dict[str, object]:
    return {
        "profile_id": "p1",
        "request": {"description": _SECRET_TEXT},
        "expected_status": "eligible",
        "expected_program": "NJ STARS",
        "expected_citation": "top 15% of your graduating class",
        "category": "clear",
        **overrides,
    }


def _load(tmp_path, content: object) -> list:
    path = tmp_path / "profiles.json"
    path.write_text(content if isinstance(content, str) else json.dumps(content), "utf-8")
    return load_profiles(path, _DOCUMENTS)


def test_valid_profiles_load(tmp_path):
    assert [p.profile_id for p in _load(tmp_path, [_profile()])] == ["p1"]


@pytest.mark.parametrize(
    ("content", "message"),
    [
        ("{not json", "not valid JSON"),
        ([], "non-empty JSON array"),
        ({"profile_id": "p1"}, "non-empty JSON array"),
        ([_profile(), _profile()], "p1: duplicate profile id"),
        ([_profile(expected_program="Unknown Grant")], "expected_program is not in the corpus"),
        ([_profile(expected_citation="must be a millionaire")], "expected_citation is not in"),
    ],
)
def test_bad_profile_files_are_input_errors(tmp_path, content, message):
    with pytest.raises(EvaluationInputError, match=message):
        _load(tmp_path, content)


def test_a_missing_file_is_an_input_error(tmp_path):
    with pytest.raises(EvaluationInputError, match="missing or unreadable"):
        load_profiles(tmp_path / "missing.json", _DOCUMENTS)


def test_a_validation_error_names_the_field_but_never_echoes_request_text(tmp_path):
    bad = _profile(request={"description": _SECRET_TEXT, "gpa": -1})
    with pytest.raises(EvaluationInputError) as caught:
        _load(tmp_path, [bad])
    assert "p1: invalid request.gpa" in str(caught.value)
    assert _SECRET_TEXT not in str(caught.value)


def test_the_committed_profiles_are_backed_by_the_committed_corpus():
    documents = load_documents(_DATA / "programs")
    profiles = load_profiles(_DATA / "evaluation" / "profiles.json", documents)
    assert profiles


def test_out_of_corpus_profiles_score_status_only():
    documents = load_documents(_DATA / "programs")
    profiles = load_profiles(_DATA / "evaluation" / "profiles.json", documents)

    web = [profile for profile in profiles if profile.profile_id.startswith("web-")]

    assert web
    assert all(p.expected_program is None and p.expected_citation is None for p in web)
