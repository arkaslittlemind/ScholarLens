import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from app.telemetry import ScrubbingSpanProcessor


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
