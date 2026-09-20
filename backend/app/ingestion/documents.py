"""Load program documents from disk and parse their front matter."""

import re
from pathlib import Path

from pydantic import BaseModel

_SUFFIXES = {".md", ".txt"}
_REQUIRED_KEYS = ("program", "document", "url")


class IngestionInputError(Exception):
    """Raised when the source corpus is missing or malformed. Messages carry paths only."""


class SourceDocument(BaseModel):
    document_id: str
    source_id: str
    program: str
    document: str
    url: str
    body: str


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _parse_front_matter(text: str, label: str) -> tuple[dict[str, str], str]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise IngestionInputError(f"{label}: missing front matter")
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        raise IngestionInputError(f"{label}: front matter is not closed") from None

    fields: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip():
            continue
        key, separator, value = line.partition(":")
        if not separator:
            raise IngestionInputError(f"{label}: malformed front matter line")
        fields[key.strip()] = value.strip().strip("\"'")
    return fields, "\n".join(lines[end + 1 :]).strip()


def _load_document(path: Path, source_dir: Path) -> SourceDocument:
    relative = path.relative_to(source_dir)
    label = relative.as_posix()
    try:
        # utf-8-sig so a BOM from a Windows editor does not hide the opening delimiter.
        text = path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError) as exc:
        raise IngestionInputError(f"{label}: unreadable file") from exc

    fields, body = _parse_front_matter(text, label)
    for key in _REQUIRED_KEYS:
        if not fields.get(key):
            raise IngestionInputError(f"{label}: missing required key '{key}'")
    if not re.match(r"https?://\S+$", fields["url"]):
        raise IngestionInputError(f"{label}: url must be an http(s) address")
    if not body:
        raise IngestionInputError(f"{label}: document body is empty")

    source_id = slugify(fields["program"])
    if not source_id:
        raise IngestionInputError(f"{label}: program name has no usable characters")

    return SourceDocument(
        document_id=relative.with_suffix("").as_posix(),
        source_id=source_id,
        program=fields["program"],
        document=fields["document"],
        url=fields["url"],
        body=body,
    )


def load_documents(source_dir: Path) -> list[SourceDocument]:
    """Load every `.md`/`.txt` file under `source_dir`, sorted for a deterministic order."""
    if not source_dir.is_dir():
        raise IngestionInputError(f"source directory not found: {source_dir}")

    paths = sorted(
        path
        for path in source_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in _SUFFIXES
    )
    documents = [_load_document(path, source_dir) for path in paths]
    if not documents:
        raise IngestionInputError(f"no source documents found in {source_dir}")

    seen: set[str] = set()
    for document in documents:
        # a.md and a.txt would collapse to one id and silently overwrite each other's chunks.
        if document.document_id in seen:
            raise IngestionInputError(f"{document.document_id}: duplicate document id")
        seen.add(document.document_id)
    return sorted(documents, key=lambda document: document.document_id)
