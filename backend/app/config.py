"""Typed application settings, loaded from the environment (and `.env` in dev)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    google_api_key: str | None = None
    tavily_api_key: str | None = None
    frontend_origin: str = "http://localhost:3000"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection_name: str = "scholarship_programs"
    agent_model: str = "google:gemini-2.5-flash"
    embedding_model: str = "gemini-embedding-001"
    retrieval_top_k: int = 5
    llm_timeout_seconds: float = 20.0
    chroma_timeout_seconds: float = 5.0
    web_search_timeout_seconds: float = 10.0
    agent_run_timeout_seconds: float = 45.0

    ingestion_source_dir: str = "data/programs"
    ingestion_status_path: str = "data/ingestion-status.json"
    ingestion_chunk_max_chars: int = 1200
    ingestion_timeout_seconds: float = 60.0

    evaluation_profiles_path: str = "data/evaluation/profiles.json"
    evaluation_runs_path: str = "data/evaluation-runs.jsonl"
    evaluation_repeats: int = Field(default=3, ge=1)
    evaluation_attempt_delay_seconds: float = Field(default=0.0, ge=0)


@lru_cache
def get_settings() -> Settings:
    return Settings()
