"""Deterministic, heading-aware chunking of program documents."""

import re

from pydantic import BaseModel

from app.ingestion.documents import SourceDocument

_HEADING = re.compile(r"^#{1,3}\s+(.+?)\s*#*\s*$")
_PARAGRAPH_BREAK = re.compile(r"\n\s*\n")
# Zero-width, so the whitespace after a sentence stays attached to the next piece and
# concatenating the pieces reproduces the paragraph exactly.
_SENTENCE_BREAK = re.compile(r"(?<=[.!?])(?=\s)")


class Chunk(BaseModel):
    chunk_id: str
    source_id: str
    document_id: str
    program: str
    document: str
    url: str
    section: str
    text: str

    def metadata(self) -> dict[str, str]:
        return {
            "program": self.program,
            "document": self.document,
            "url": self.url,
            "source_id": self.source_id,
            "document_id": self.document_id,
            "section": self.section,
        }


def _sections(body: str, default_title: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    title = default_title
    lines: list[str] = []

    def flush() -> None:
        text = "\n".join(lines).strip()
        if text:
            sections.append((title, text))

    for line in body.splitlines():
        heading = _HEADING.match(line)
        if heading:
            flush()
            title = heading.group(1)
            lines = []
        else:
            lines.append(line)
    flush()
    return sections


def _split_long(paragraph: str, max_chars: int) -> list[str]:
    """Split an over-long paragraph on sentence boundaries, hard-cutting only as a last resort."""
    pieces: list[str] = []
    current = ""
    for sentence in _SENTENCE_BREAK.split(paragraph):
        for start in range(0, len(sentence), max_chars):
            part = sentence[start : start + max_chars]
            if len(current) + len(part) <= max_chars:
                current += part
            else:
                if current.strip():
                    pieces.append(current.strip())
                current = part.lstrip()
    if current.strip():
        pieces.append(current.strip())
    return pieces


def _pack(text: str, max_chars: int) -> list[str]:
    chunks: list[str] = []
    current = ""
    for paragraph in (p.strip() for p in _PARAGRAPH_BREAK.split(text)):
        if not paragraph:
            continue
        if len(paragraph) > max_chars:
            # Its own chunks, so a clause is never fused with unrelated neighbours.
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_long(paragraph, max_chars))
            continue
        joined = f"{current}\n\n{paragraph}" if current else paragraph
        if len(joined) <= max_chars:
            current = joined
        else:
            chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def chunk_document(document: SourceDocument, max_chars: int) -> list[Chunk]:
    """Chunk one document. No overlap, so a quoted clause stays whole inside its chunk."""
    texts_by_section = [
        (section, text)
        for section, body in _sections(document.body, document.document)
        for text in _pack(body, max_chars)
    ]
    return [
        Chunk(
            chunk_id=f"{document.document_id}#{index:04d}",
            source_id=document.source_id,
            document_id=document.document_id,
            program=document.program,
            document=document.document,
            url=document.url,
            section=section,
            text=text,
        )
        for index, (section, text) in enumerate(texts_by_section)
    ]
