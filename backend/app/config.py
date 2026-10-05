"""Typed application settings, loaded from the environment (and `.env` in dev)."""

import re
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # SecretStr keeps keys out of reprs, dumps, and validation errors; read them with secret_value.
    google_api_key: SecretStr | None = None
    tavily_api_key: SecretStr | None = None
    frontend_origin: str = "http://localhost:3000"
    # Per process and reset on restart; they bound Gemini spend on the public endpoint.
    rate_limit_per_minute: int = Field(default=5, ge=1)
    rate_limit_per_day: int = Field(default=20, ge=1)
    rate_limit_global_per_day: int = Field(default=100, ge=1)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # Not "localhost": Compose publishes ChromaDB on IPv4 only, and Windows tries IPv6 first,
    # which costs seconds per connection and pushes the first query past its timeout.
    chroma_host: str = "127.0.0.1"
    chroma_port: int = 8001
    chroma_collection_name: str = "scholarship_programs"
    # Set in production to run Chroma embedded on the service's volume instead of as a server.
    chroma_persist_path: str | None = None
    agent_model: str = "google:gemini-3.8-flash"
    embedding_model: str = "gemini-embedding-001"
    retrieval_top_k: int = 5
    # Gemini enforces this as the request deadline (504 DEADLINE_EXCEEDED); 20 s cut off answers
    # that needed about 21 s.
    llm_timeout_seconds: float = Field(default=30.0, gt=0)
    chroma_timeout_seconds: float = Field(default=5.0, gt=0)
    web_search_timeout_seconds: float = Field(default=10.0, gt=0)
    agent_run_timeout_seconds: float = Field(default=45.0, gt=0)

    # Tracing stays a no-op unless an OTLP collector endpoint is configured.
    otel_exporter_otlp_endpoint: str | None = None
    otel_export_timeout_seconds: float = Field(default=5.0, gt=0)

    ingestion_source_dir: str = "data/programs"
    ingestion_status_path: str = "data/ingestion-status.json"
    ingestion_chunk_max_chars: int = 1200
    ingestion_timeout_seconds: float = Field(default=60.0, gt=0)

    evaluation_profiles_path: str = "data/evaluation/profiles.json"
    evaluation_runs_path: str = "data/evaluation-runs.jsonl"
    evaluation_repeats: int = Field(default=3, ge=1)
    evaluation_attempt_delay_seconds: float = Field(default=0.0, ge=0)

    # Shared with the frontend's server side; unset disables /ops/summary.
    ops_api_token: SecretStr | None = None
    # A read-only (metrics:read) Grafana Cloud Prometheus login, separate from the OTLP push one.
    grafana_prometheus_url: str | None = None
    grafana_prometheus_user: str | None = None
    grafana_prometheus_token: SecretStr | None = None
    grafana_query_timeout_seconds: float = Field(default=5.0, gt=0)

    @field_validator("frontend_origin")
    @classmethod
    def _single_origin(cls, value: str) -> str:
        # CORS compares origins byte for byte, so a trailing slash or path silently blocks
        # every browser request instead of failing loudly.
        error = "must be a single origin such as https://app.example.com"
        parts = urlsplit(value)
        try:
            port = parts.port
        except ValueError as exc:
            raise ValueError(error) from exc
        hostname = parts.hostname or ""
        default_port = {"http": 80, "https": 443}.get(parts.scheme)
        if (
            default_port is None
            or not re.fullmatch(r"[a-z0-9.-]+|[0-9a-f:.]+", hostname)
            or port in (0, default_port)
        ):
            raise ValueError(error)
        # Browsers send the origin lowercased and without a default port, so anything but that
        # exact form (case, empty port, path, userinfo) would never match.
        host = f"[{hostname}]" if ":" in hostname else hostname
        if value != f"{parts.scheme}://{host}" + (f":{port}" if port is not None else ""):
            raise ValueError(error)
        return value


def secret_value(secret: SecretStr | None) -> str:
    """The raw secret, or "" when unset; an empty value means not configured."""
    return secret.get_secret_value() if secret is not None else ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
