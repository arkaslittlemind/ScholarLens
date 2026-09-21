"""Load the labeled profiles and check their labels against the current corpus."""

import json
from pathlib import Path

from pydantic import ValidationError

from app.evaluation.models import EvaluationInputError, EvaluationProfile
from app.ingestion.documents import SourceDocument, slugify


def _parse(raw: object) -> EvaluationProfile:
    profile_id = raw.get("profile_id") if isinstance(raw, dict) else None
    try:
        return EvaluationProfile.model_validate(raw)
    except ValidationError as exc:
        # str(exc) and the error's `input` echo request text, so report only the field path
        # and Pydantic's fixed message.
        error = exc.errors()[0]
        field = ".".join(str(part) for part in error["loc"]) or "profile"
        raise EvaluationInputError(f"{profile_id}: invalid {field} ({error['msg']})") from None


def _check_against_corpus(profile: EvaluationProfile, documents: list[SourceDocument]) -> None:
    if profile.expected_program is None or profile.expected_citation is None:
        return
    bodies = [doc.body for doc in documents if doc.program == profile.expected_program]
    if not bodies:
        raise EvaluationInputError(f"{profile.profile_id}: expected_program is not in the corpus")
    citation = slugify(profile.expected_citation)
    if not citation or not any(citation in slugify(body) for body in bodies):
        raise EvaluationInputError(
            f"{profile.profile_id}: expected_citation is not in the program's document"
        )


def load_profiles(path: Path, documents: list[SourceDocument]) -> list[EvaluationProfile]:
    """Load and validate every profile; a label the corpus cannot back is an input error."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        raise EvaluationInputError("profiles file is missing or unreadable") from exc
    except ValueError as exc:
        raise EvaluationInputError("profiles file is not valid JSON") from exc
    if not isinstance(raw, list) or not raw:
        raise EvaluationInputError("profiles file must hold a non-empty JSON array")

    profiles = [_parse(item) for item in raw]
    seen: set[str] = set()
    for profile in profiles:
        if profile.profile_id in seen:
            raise EvaluationInputError(f"{profile.profile_id}: duplicate profile id")
        seen.add(profile.profile_id)
        _check_against_corpus(profile, documents)
    return profiles
