import asyncio
import time

import pytest
from chromadb.api.client import SharedSystemClient

from app.retrieval import client as retrieval
from app.retrieval.client import DocumentRetriever, RetrievalUnavailableError


class _FakeEmbedding:
    def embed_query(self, input: list[str]) -> list[list[float]]:
        return [[0.1, 0.2]]


class _FakeCollection:
    def __init__(self, result: dict | None = None, delay: float = 0.0, error: bool = False):
        self.result = result or {"documents": [[]], "metadatas": [[]]}
        self.delay = delay
        self.error = error
        self.calls: list[dict] = []

    def query(self, **kwargs: object) -> dict:
        self.calls.append(kwargs)
        if self.delay:
            time.sleep(self.delay)
        if self.error:
            raise ConnectionError("chroma is down")
        return self.result


class _FakeClient:
    def __init__(self, collection: _FakeCollection) -> None:
        self.collection = collection

    def get_or_create_collection(self, **_: object) -> _FakeCollection:
        return self.collection


@pytest.fixture
def retriever_for(monkeypatch, make_settings):
    def build(collection: _FakeCollection, **settings: object) -> DocumentRetriever:
        monkeypatch.setattr(retrieval, "build_embedding_function", lambda _: _FakeEmbedding())
        monkeypatch.setattr(retrieval, "get_chroma_client", lambda _: _FakeClient(collection))
        return DocumentRetriever(make_settings(**settings))

    return build


def test_matches_map_to_chunks_and_top_k_is_passed_through(retriever_for):
    collection = _FakeCollection(
        {
            "documents": [["Must be a resident.", "Other text."]],
            "metadatas": [
                [
                    {"program": "NJ STARS", "document": "Rules", "url": "https://e.org"},
                    None,
                ]
            ],
        }
    )
    retriever = retriever_for(collection, retrieval_top_k=3)

    chunks = asyncio.run(retriever.retrieve("resident"))

    assert chunks[0].model_dump() == {
        "text": "Must be a resident.",
        "program": "NJ STARS",
        "document": "Rules",
        "url": "https://e.org",
    }
    assert chunks[1].program == ""
    assert collection.calls == [{"query_embeddings": [[0.1, 0.2]], "n_results": 3}]


def test_an_empty_collection_is_no_matches_not_an_error(retriever_for):
    assert asyncio.run(retriever_for(_FakeCollection()).retrieve("anything")) == []


def test_a_slow_query_times_out_as_unavailable(retriever_for):
    retriever = retriever_for(_FakeCollection(delay=0.5), chroma_timeout_seconds=0.05)
    with pytest.raises(RetrievalUnavailableError, match="timed out"):
        asyncio.run(retriever.retrieve("anything"))


def test_a_client_failure_is_unavailable(retriever_for):
    with pytest.raises(RetrievalUnavailableError, match="failed"):
        asyncio.run(retriever_for(_FakeCollection(error=True)).retrieve("anything"))


def test_persist_path_selects_an_embedded_store_that_survives_a_new_client(make_settings, tmp_path):
    settings = make_settings(chroma_persist_path=str(tmp_path / "chroma"))

    retrieval.get_chroma_client(settings).get_or_create_collection("programs").add(
        ids=["a", "b"], documents=["one", "two"], embeddings=[[0.1, 0.2], [0.3, 0.4]]
    )
    # Chroma shares one in-memory system per path within a process; drop it so the
    # second client really reopens the store from disk.
    SharedSystemClient.clear_system_cache()

    assert retrieval.get_chroma_client(settings).get_collection("programs").count() == 2
