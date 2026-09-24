"""OpenTelemetry tracing setup: OTLP export to the collector plus FastAPI request spans."""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Span, Status, StatusCode

from app.config import Settings

SERVICE_NAME = "scholarlens-api"

_tracer = trace.get_tracer("scholarlens")


def configure_tracing(settings: Settings, app: FastAPI) -> None:
    """Export spans when a collector endpoint is set; otherwise leave the no-op tracer in place."""
    if not settings.otel_exporter_otlp_endpoint:
        return

    provider = TracerProvider(
        resource=Resource.create({"service.name": SERVICE_NAME, "service.version": app.version})
    )
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=settings.otel_exporter_otlp_endpoint,
                timeout=settings.otel_export_timeout_seconds,
            )
        )
    )
    trace.set_tracer_provider(provider)
    # Health probes run every few seconds and would drown out real traffic in Tempo.
    FastAPIInstrumentor.instrument_app(
        app, excluded_urls="/health$", exclude_spans=["receive", "send"]
    )


@contextmanager
def traced_span(name: str) -> Iterator[Span]:
    """A span that records a failure by exception type only, never its message."""
    with _tracer.start_as_current_span(
        name, record_exception=False, set_status_on_exception=False
    ) as span:
        try:
            yield span
        except Exception as exc:
            # A provider exception's message can echo the prompt or tool query.
            error_type = type(exc).__name__
            span.set_attribute("error.type", error_type)
            span.set_status(Status(StatusCode.ERROR, error_type))
            raise
