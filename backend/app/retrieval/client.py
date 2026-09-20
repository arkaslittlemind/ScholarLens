"""Thin, timeout-guarded ChromaDB retrieval client."""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from chromadb.api.types import EmbeddingFunction
from chromadb.utils import embedding_functions
from pydantic import BaseModel

from app.config import Settings


def get_chroma_client(settings: Settings) -> ClientAPI:
    return chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)


def build_embedding_function(settings: Settings) -> EmbeddingFunction:
    """The one embedding function shared by retrieval and ingestion, so both use the same space."""
    # GoogleGenaiEmbeddingFunction only reads its key from an env var, never a
    # constructor argument, so the setting has to be projected there first.
    if settings.google_api_key:
        os.environ["GOOGLE_API_KEY"] = settings.google_api_key
    return embedding_functions.GoogleGenaiEmbeddingFunction(
        model_name=settings.embedding_model,
        api_key_env_var="GOOGLE_API_KEY",
    )


class RetrievalUnavailableError(Exception):
    """Raised when ChromaDB cannot be reached or a query times out."""


class RetrievedChunk(BaseModel):
    text: str
    program: str
    document: str
    url: str


class DocumentRetriever:
    """Queries the ChromaDB collection the ingestion pipeline fills.

    The collection may not exist yet or may be empty; both are normal states,
    not errors. Only a connection failure or timeout raises.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._collection: Collection | None = None
        # A dedicated, bounded pool: a blackholed ChromaDB host leaks a thread per
        # timeout (chromadb's own HTTP session has no socket timeout), so this keeps
        # that leak capped and attributable instead of draining the shared default
        # executor every other `run_in_executor` caller in the process relies on.
        self._executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="chroma-retrieval")

    def _get_collection(self) -> Collection:
        if self._collection is None:
            self._collection = get_chroma_client(self._settings).get_or_create_collection(
                name=self._settings.chroma_collection_name,
                embedding_function=build_embedding_function(self._settings),
            )
        return self._collection

    def _query(self, query: str) -> list[RetrievedChunk]:
        collection = self._get_collection()
        result = collection.query(query_texts=[query], n_results=self._settings.retrieval_top_k)
        documents = (result.get("documents") or [[]])[0]
        metadatas = (result.get("metadatas") or [[]])[0]
        chunks = []
        for text, metadata in zip(documents, metadatas, strict=True):
            metadata = metadata or {}
            chunks.append(
                RetrievedChunk(
                    text=text,
                    program=str(metadata.get("program", "")),
                    document=str(metadata.get("document", "")),
                    url=str(metadata.get("url", "")),
                )
            )
        return chunks

    async def retrieve(self, query: str) -> list[RetrievedChunk]:
        """Return the top matching chunks for `query`, or `[]` if none exist."""
        loop = asyncio.get_running_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(self._executor, self._query, query),
                timeout=self._settings.chroma_timeout_seconds,
            )
        except TimeoutError as exc:
            raise RetrievalUnavailableError("ChromaDB query timed out") from exc
        except Exception as exc:
            raise RetrievalUnavailableError("ChromaDB query failed") from exc
