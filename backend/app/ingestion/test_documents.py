import pytest

from app.ingestion.documents import IngestionInputError, load_documents, slugify

_FRONT = "---\nprogram: Test Grant\ndocument: Rules\nurl: https://example.org/rules\n---\n"


def _write(path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


@pytest.mark.parametrize(
    ("text", "slug"),
    [
        ("NJ STARS (and NJ STARS II)", "nj-stars-and-nj-stars-ii"),
        ("  Top 15% of class!  ", "top-15-of-class"),
        ("!!!", ""),
    ],
)
def test_slugify(text, slug):
    assert slugify(text) == slug


def test_loads_documents_sorted_with_ids_from_their_relative_path(tmp_path):
    _write(tmp_path / "b.md", _FRONT + "Body B")
    _write(tmp_path / "sub" / "a.txt", _FRONT + "Body A")
    _write(tmp_path / "notes.pdf", "ignored")

    documents = load_documents(tmp_path)

    assert [d.document_id for d in documents] == ["b", "sub/a"]
    assert documents[0].source_id == "test-grant"
    assert documents[0].body == "Body B"


def test_a_utf8_bom_does_not_hide_the_front_matter(tmp_path):
    (tmp_path / "a.md").write_bytes(("﻿" + _FRONT + "Body").encode("utf-8"))
    assert load_documents(tmp_path)[0].program == "Test Grant"


def test_quoted_front_matter_values_are_unquoted(tmp_path):
    _write(tmp_path / "a.md", _FRONT.replace("Test Grant", '"Test Grant"') + "Body")
    assert load_documents(tmp_path)[0].program == "Test Grant"


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("Body only", "missing front matter"),
        ("---\nprogram: X\nBody", "front matter is not closed"),
        ("---\nprogram X\n---\nBody", "malformed front matter line"),
        (_FRONT.replace("document: Rules\n", ""), "missing required key 'document'"),
        (_FRONT.replace("https://example.org/rules", "example.org") + "Body", "http(s)"),
        (_FRONT, "document body is empty"),
        (_FRONT.replace("Test Grant", "!!!") + "Body", "no usable characters"),
    ],
)
def test_malformed_documents_are_rejected_by_path(tmp_path, text, message):
    _write(tmp_path / "bad.md", text)
    with pytest.raises(IngestionInputError) as caught:
        load_documents(tmp_path)
    assert message in str(caught.value)
    assert str(caught.value).startswith("bad.md")


def test_same_stem_with_two_suffixes_is_a_duplicate(tmp_path):
    _write(tmp_path / "a.md", _FRONT + "Body")
    _write(tmp_path / "a.txt", _FRONT + "Body")
    with pytest.raises(IngestionInputError, match="duplicate document id"):
        load_documents(tmp_path)


def test_missing_or_empty_directory_is_an_input_error(tmp_path):
    with pytest.raises(IngestionInputError, match="not found"):
        load_documents(tmp_path / "missing")
    with pytest.raises(IngestionInputError, match="no source documents"):
        load_documents(tmp_path)
