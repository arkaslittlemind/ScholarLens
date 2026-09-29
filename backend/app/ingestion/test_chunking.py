from app.ingestion.chunking import chunk_document
from app.ingestion.documents import SourceDocument


def _document(body: str) -> SourceDocument:
    return SourceDocument(
        document_id="nj/stars",
        source_id="nj-stars",
        program="NJ STARS",
        document="Eligibility summary",
        url="https://example.org/stars",
        body=body,
    )


def test_headings_start_sections_and_text_before_any_heading_uses_the_document_title():
    chunks = chunk_document(_document("Intro text.\n\n## Eligibility\n\nMust be a resident."), 1200)

    assert [(c.section, c.text) for c in chunks] == [
        ("Eligibility summary", "Intro text."),
        ("Eligibility", "Must be a resident."),
    ]


def test_chunk_ids_are_stable_and_zero_padded_across_sections():
    chunks = chunk_document(_document("## A\n\none\n\n## B\n\ntwo"), 1200)
    assert [c.chunk_id for c in chunks] == ["nj/stars#0000", "nj/stars#0001"]
    assert chunks[0].metadata()["url"] == "https://example.org/stars"


def test_paragraphs_are_packed_up_to_the_limit_and_never_split_when_they_fit():
    body = "\n\n".join(["a" * 40, "b" * 40, "c" * 40])

    chunks = chunk_document(_document(body), 90)

    assert [c.text for c in chunks] == [f"{'a' * 40}\n\n{'b' * 40}", "c" * 40]


def test_an_over_long_paragraph_splits_on_sentences_and_keeps_every_character():
    sentences = ["First rule applies here.", "Second rule applies too.", "Third one."]
    paragraph = " ".join(sentences)

    chunks = chunk_document(_document(f"short\n\n{paragraph}\n\nafter"), 30)

    texts = [c.text for c in chunks]
    assert texts == ["short", *sentences, "after"]
    assert all(len(text) <= 30 for text in texts)


def test_a_sentence_longer_than_the_limit_is_hard_cut():
    chunks = chunk_document(_document("x" * 25), 10)
    assert [c.text for c in chunks] == ["x" * 10, "x" * 10, "x" * 5]


def test_heading_only_sections_produce_no_chunks():
    assert chunk_document(_document("## Empty\n\n## Filled\n\ntext"), 1200)[0].section == "Filled"
