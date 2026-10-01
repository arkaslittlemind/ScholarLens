import logging

import pytest
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import InMemoryLogRecordExporter, SimpleLogRecordProcessor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from app.logging import reset_correlation_id, set_correlation_id
from app.telemetry import ScrubbingLogRecordProcessor, ScrubbingSpanProcessor, otlp_signal_url


@pytest.fixture
def exported():
    # A local provider, so the global one the app configures is never touched.
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(ScrubbingSpanProcessor(SimpleSpanProcessor(exporter)))
    return provider.get_tracer("test"), exporter


def test_visitor_attributes_are_removed_and_others_kept(exported):
    tracer, exporter = exported
    with tracer.start_as_current_span("request") as span:
        span.set_attribute("client.address", "203.0.113.9")
        span.set_attribute("user_agent.original", "Mozilla/5.0")
        span.set_attribute("http.route", "/eligibility")

    attributes = dict(exporter.get_finished_spans()[0].attributes)
    assert attributes == {"http.route": "/eligibility"}


def test_exception_text_is_removed_and_status_keeps_only_the_type(exported):
    tracer, exporter = exported
    with pytest.raises(ValueError), tracer.start_as_current_span("call"):
        raise ValueError("student text")

    span = exporter.get_finished_spans()[0]
    event = span.events[0]
    assert event.name == "exception"
    assert event.attributes["exception.type"] == "ValueError"
    assert "exception.message" not in event.attributes
    assert "exception.stacktrace" not in event.attributes
    assert span.status.status_code == StatusCode.ERROR
    assert span.status.description == "ValueError"


def test_a_status_description_that_is_not_a_type_name_is_dropped(exported):
    tracer, exporter = exported
    with tracer.start_as_current_span("call") as span:
        span.set_status(StatusCode.ERROR, "free text about a student")

    assert exporter.get_finished_spans()[0].status.description is None


@pytest.mark.parametrize(
    "base",
    ["http://otel-collector:4318", "http://otel-collector:4318/"],
)
def test_signal_urls_join_the_base_and_the_signal_path_once(base):
    assert otlp_signal_url(base, "traces") == "http://otel-collector:4318/v1/traces"


@pytest.mark.parametrize(
    "base",
    [
        "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
        "https://otlp-gateway-prod-us-east-0.grafana.net/otlp/",
    ],
)
def test_signal_urls_keep_a_base_path(base):
    assert (
        otlp_signal_url(base, "logs")
        == "https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/logs"
    )


@pytest.fixture
def exported_logs():
    # A local provider and logger, so the app's own logging setup is never touched.
    exporter = InMemoryLogRecordExporter()
    provider = LoggerProvider()
    provider.add_log_record_processor(
        ScrubbingLogRecordProcessor(SimpleLogRecordProcessor(exporter))
    )
    logger = logging.getLogger("test.otel")
    saved = (logger.handlers, logger.propagate, logger.level)
    logger.handlers = [LoggingHandler(logger_provider=provider)]
    logger.propagate = False
    logger.setLevel(logging.INFO)
    yield logger, exporter
    logger.handlers, logger.propagate, logger.level = saved


def _only_attributes(exporter) -> dict:
    (record,) = exporter.get_finished_logs()
    return dict(record.log_record.attributes)


def test_allowed_log_fields_are_kept_and_unknown_ones_dropped(exported_logs):
    logger, exporter = exported_logs
    logger.info("request completed", extra={"path": "/eligibility", "description": "student text"})

    (record,) = exporter.get_finished_logs()
    attributes = dict(record.log_record.attributes)
    assert record.log_record.body == "request completed"
    assert attributes["path"] == "/eligibility"
    assert "description" not in attributes
    assert attributes["code.function.name"].startswith("test_allowed_log_fields")


def test_a_logged_exception_keeps_its_type_and_never_its_text(exported_logs):
    logger, exporter = exported_logs
    try:
        raise ValueError("student text")
    except ValueError:
        logger.exception("agent failed")

    attributes = _only_attributes(exporter)
    assert attributes["exception.type"] == "ValueError"
    assert "exception.message" not in attributes
    assert "exception.stacktrace" not in attributes
    assert "student text" not in repr(attributes)


def test_the_request_correlation_id_is_attached(exported_logs):
    logger, exporter = exported_logs
    token = set_correlation_id("abc-123")
    try:
        logger.info("request completed")
    finally:
        reset_correlation_id(token)

    assert _only_attributes(exporter)["correlation_id"] == "abc-123"
