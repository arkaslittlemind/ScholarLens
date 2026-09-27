"""OpenTelemetry setup: OTLP export of traces and metrics, FastAPI request spans, app metrics."""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import View
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Span, Status, StatusCode

from app.config import Settings

SERVICE_NAME = "scholarlens-api"

_tracer = trace.get_tracer("scholarlens")
# Instruments made from the global proxy meter bind to the real provider once it is set.
_meter = metrics.get_meter("scholarlens")

# Every attribute value below comes from a fixed set, never from request or provider text.
agent_duration = _meter.create_histogram(
    "scholarlens.agent.duration", unit="s", description="Duration of one eligibility agent run."
)
llm_requests = _meter.create_counter(
    "scholarlens.llm.requests",
    unit="{request}",
    description="Model requests made by completed agent runs.",
)
tool_calls = _meter.create_counter(
    "scholarlens.tool.calls", unit="{call}", description="Agent tool invocations by tool."
)
retrieval_duration = _meter.create_histogram(
    "scholarlens.retrieval.duration", unit="s", description="Duration of one ChromaDB retrieval."
)
web_search_duration = _meter.create_histogram(
    "scholarlens.web_search.duration", unit="s", description="Duration of one Tavily search."
)


def configure_telemetry(settings: Settings, app: FastAPI) -> None:
    """Export spans and metrics when a collector endpoint is set; otherwise stay no-op."""
    if not settings.otel_exporter_otlp_endpoint:
        return

    resource = Resource.create({"service.name": SERVICE_NAME, "service.version": app.version})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=settings.otel_exporter_otlp_endpoint,
                timeout=settings.otel_export_timeout_seconds,
            )
        )
    )
    trace.set_tracer_provider(provider)
    metrics.set_meter_provider(
        MeterProvider(
            resource=resource,
            # The instrumentor also labels by server name, taken from the client's Host header,
            # which would let any caller mint new series; keep only closed-value attributes.
            views=[
                View(
                    instrument_name="http.server.*",
                    attribute_keys={"http.method", "http.target", "http.status_code"},
                )
            ],
            metric_readers=[
                PeriodicExportingMetricReader(
                    OTLPMetricExporter(
                        endpoint=settings.otel_exporter_otlp_endpoint,
                        timeout=settings.otel_export_timeout_seconds,
                    )
                )
            ],
        )
    )
    # After the meter provider, so the instrumentor records request metrics against it.
    # Health probes run every few seconds and would drown out real traffic.
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
