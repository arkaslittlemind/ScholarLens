import pytest
from pydantic import ValidationError

from app.config import secret_value


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:3000",
        "https://app.example.com",
        "https://app.example.com:8443",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
    ],
)
def test_frontend_origin_accepts_exact_origins(make_settings, origin):
    assert make_settings(frontend_origin=origin).frontend_origin == origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://app.example.com/",
        "https://app.example.com/check",
        "https://App.example.com",
        "https://app.example.com:443",
        "http://app.example.com:80",
        "https://app.example.com:",
        "https://app.example.com:0",
        "ftp://app.example.com",
        "https://user@app.example.com",
        "app.example.com",
        "",
    ],
)
def test_frontend_origin_rejects_anything_a_browser_would_not_send(make_settings, origin):
    with pytest.raises(ValidationError):
        make_settings(frontend_origin=origin)


def test_secrets_stay_out_of_reprs_and_dumps(make_settings):
    settings = make_settings(google_api_key="real-key-value")
    assert "real-key-value" not in repr(settings)
    assert "real-key-value" not in str(settings.model_dump())
    assert secret_value(settings.google_api_key) == "real-key-value"


def test_unset_secret_reads_as_empty(make_settings):
    assert secret_value(make_settings().tavily_api_key) == ""


@pytest.mark.parametrize("field", ["rate_limit_per_minute", "rate_limit_per_day"])
def test_rate_limits_must_be_positive(make_settings, field):
    with pytest.raises(ValidationError):
        make_settings(**{field: 0})


def test_chroma_persist_path_defaults_to_the_chroma_server(make_settings):
    assert make_settings().chroma_persist_path is None
