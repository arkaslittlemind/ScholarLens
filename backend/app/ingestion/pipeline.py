"""Rebuild the ChromaDB knowledge base from the source documents."""

import os
import threading
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, TypeVar

from chromadb.api.models.Collection import Collection
from chromadb.api.types import EmbeddingFunction
from chromadb.errors import NotFoundError
from pydantic import BaseModel

from app.config import Settings
from app.ingestion.chunking import Chunk, chunk_document
from app.ingestion.documents import IngestionInputError, load_documents
from app.retrieval.client import build_embedding_function, get_chroma_client

_BATCH_SIZE = 100

T = TypeVar("T")


class IngestionError(Exception):
    """Raised when an external step fails. Messages are fixed strings, never provider output."""


class IngestionStatus(BaseModel):
    run_id: str
    status: Literal["succeeded", "failed"]
    started_at: str
    finished_at: str
    collection: str
    embedding_model: str
    document_count: int
    chunk_count: int
    error: str | None = None


def _bounded(call: Callable[[], T], timeout: float, step: str) -> T:
    """Run a blocking call with a deadline.

    Neither chromadb's HTTP client nor the Gemini embedding function is given a client-side
    timeout here, so the call runs in a daemon thread; a hung one cannot keep the process
    alive after we give up on it.
    """
    outcome: list[T] = []
    failure: list[Exception] = []

    def run() -> None:
        try:
            outcome.append(call())
        except Exception as exc:
            failure.append(exc)

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    worker.join(timeout)
    if worker.is_alive():
        raise IngestionError(f"{step} timed out")
    if failure:
        # The class name aids debugging; the message may carry provider payloads, so drop it.
        raise IngestionError(f"{step} failed ({type(failure[0]).__name__})") from failure[0]
    return outcome[0]


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _write_status(path: Path, status: IngestionStatus) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(status.model_dump_json(indent=2), encoding="utf-8")
    os.replace(temp, path)


def _chunk_corpus(settings: Settings) -> tuple[int, list[Chunk]]:
    documents = load_documents(Path(settings.ingestion_source_dir))
    chunks: list[Chunk] = []
    for document in documents:
        document_chunks = chunk_document(document, settings.ingestion_chunk_max_chars)
        if not document_chunks:
            raise IngestionInputError(f"{document.document_id}: no chunkable text")
        chunks.extend(document_chunks)
    return len(documents), chunks


def _batches(items: list[T]) -> list[list[T]]:
    return [items[start : start + _BATCH_SIZE] for start in range(0, len(items), _BATCH_SIZE)]


def _embed_chunks(settings: Settings, chunks: list[Chunk]) -> tuple[EmbeddingFunction, list]:
    timeout = settings.ingestion_timeout_seconds
    try:
        embedding_function = build_embedding_function(settings)
    except Exception as exc:
        raise IngestionError("embedding setup failed") from exc

    embeddings = []
    for batch in _batches(chunks):
        texts = [chunk.text for chunk in batch]
        embeddings.extend(_bounded(lambda t=texts: embedding_function(t), timeout, "embedding"))
    if len(embeddings) != len(chunks):
        raise IngestionError("embedding count mismatch")
    return embedding_function, embeddings


def _write_chunks(
    collection: Collection, chunks: list[Chunk], embeddings: list, timeout: float
) -> None:
    for batch, vectors in zip(_batches(chunks), _batches(embeddings), strict=True):
        _bounded(
            lambda b=batch, v=vectors: collection.add(
                ids=[chunk.chunk_id for chunk in b],
                embeddings=v,
                documents=[chunk.text for chunk in b],
                metadatas=[chunk.metadata() for chunk in b],
            ),
            timeout,
            "chroma write",
        )


def _rebuild_collection(settings: Settings, chunks: list[Chunk]) -> None:
    timeout = settings.ingestion_timeout_seconds
    # Embed everything before touching the live collection, so a provider failure leaves the
    # existing knowledge base intact instead of half-replaced.
    embedding_function, embeddings = _embed_chunks(settings, chunks)

    client = _bounded(lambda: get_chroma_client(settings), timeout, "chroma connect")

    def drop_existing() -> None:
        try:
            client.delete_collection(settings.chroma_collection_name)
        except NotFoundError:
            pass

    _bounded(drop_existing, timeout, "chroma delete")
    # Created with the query-time embedding function so retrieval embeds questions the same way.
    collection = _bounded(
        lambda: client.create_collection(
            name=settings.chroma_collection_name, embedding_function=embedding_function
        ),
        timeout,
        "chroma create",
    )
    _write_chunks(collection, chunks, embeddings, timeout)
    if _bounded(collection.count, timeout, "chroma count") != len(chunks):
        raise IngestionError("stored chunk count mismatch")


def run_ingestion(settings: Settings) -> IngestionStatus:
    """Rebuild the collection from the source directory and record the outcome.

    Ingestion failures are returned as a `failed` status, not raised; only an inability to
    write the status record raises.
    """
    run_id = uuid.uuid4().hex
    started_at = _utc_now()
    document_count = 0
    chunk_count = 0
    error: str | None = None
    try:
        document_count, chunks = _chunk_corpus(settings)
        chunk_count = len(chunks)
        _rebuild_collection(settings, chunks)
    except (IngestionInputError, IngestionError) as exc:
        error = str(exc)
    except Exception as exc:
        error = f"unexpected {type(exc).__name__}"

    status = IngestionStatus(
        run_id=run_id,
        status="failed" if error else "succeeded",
        started_at=started_at,
        finished_at=_utc_now(),
        collection=settings.chroma_collection_name,
        embedding_model=settings.embedding_model,
        document_count=document_count,
        chunk_count=chunk_count,
        error=error,
    )
    try:
        _write_status(Path(settings.ingestion_status_path), status)
    except OSError as exc:
        raise IngestionError("could not write the status record") from exc
    return status
