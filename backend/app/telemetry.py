"""OpenTelemetry setup: OTLP export of traces and metrics, FastAPI request spans, app metrics."""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry.context import Context
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation, View
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import Event, ReadableSpan, SpanProcessor, TracerProvider
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


# The instrumentor also labels by server name, taken from the client's Host header, which would
# let any caller mint new series; keep only closed-value attributes. One view per instrument,
# because two views matching the same instrument would export it twice.
_HTTP_SERVER_ATTRIBUTES = {"http.method", "http.target", "http.status_code"}
# Must list every http.server.* instrument the FastAPI instrumentor creates (checked on 0.66b0):
# one left out keeps its Host-derived labels.
_HTTP_SERVER_INSTRUMENTS = (
    "http.server.request.size",
    "http.server.response.size",
    "http.server.active_requests",
)
# SDK defaults stop at 10 s, but eligibility requests run up to the 45 s agent timeout, so
# percentiles past 10 s would all read as 10 s.
_HTTP_DURATION_BOUNDARIES_MS = (
    0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000,
    15000, 20000, 30000, 45000, 60000,
)


def _http_server_views() -> list[View]:
    return [
        View(
            instrument_name="http.server.duration",
            attribute_keys=_HTTP_SERVER_ATTRIBUTES,
            aggregation=ExplicitBucketHistogramAggregation(_HTTP_DURATION_BOUNDARIES_MS),
        ),
        *(
            View(instrument_name=name, attribute_keys=_HTTP_SERVER_ATTRIBUTES)
            for name in _HTTP_SERVER_INSTRUMENTS
        ),
    ]


# The ASGI instrumentation records these from the connection and the User-Agent header, under
# both the old and the new semantic-convention names; each identifies the visitor.
_VISITOR_ATTRIBUTES = frozenset(
    {
        "client.address",
        "client.port",
        "net.peer.ip",
        "net.peer.port",
        "network.peer.address",
        "network.peer.port",
        "http.client_ip",
        "http.user_agent",
        "user_agent.original",
    }
)
# Any library may record a full exception, and its message can echo the student's input or a
# provider response.
_EXCEPTION_TEXT = frozenset({"exception.message", "exception.stacktrace"})


def _scrubbed(span: ReadableSpan) -> ReadableSpan:
    status = span.status
    if status.description:
        # The SDK describes an exception as "Type: message"; keep only the type.
        status = Status(status.status_code, status.description.split(": ", 1)[0])
    return ReadableSpan(
        name=span.name,
        context=span.context,
        parent=span.parent,
        resource=span.resource,
        attributes={
            key: value
            for key, value in (span.attributes or {}).items()
            if key not in _VISITOR_ATTRIBUTES
        },
        events=[
            Event(
                event.name,
                {k: v for k, v in (event.attributes or {}).items() if k not in _EXCEPTION_TEXT},
                event.timestamp,
            )
            for event in span.events
        ],
        links=span.links,
        kind=span.kind,
        status=status,
        start_time=span.start_time,
        end_time=span.end_time,
        instrumentation_scope=span.instrumentation_scope,
    )


class ScrubbingSpanProcessor(SpanProcessor):
    """Hands the wrapped processor a copy of each ended span without visitor identifiers or
    exception text, so nothing downstream of the app ever receives them."""

    def __init__(self, inner: SpanProcessor) -> None:
        self._inner = inner

    def on_start(self, span: Span, parent_context: Context | None = None) -> None:
        self._inner.on_start(span, parent_context=parent_context)

    def on_end(self, span: ReadableSpan) -> None:
        self._inner.on_end(_scrubbed(span))

    def shutdown(self) -> None:
        self._inner.shutdown()

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return self._inner.force_flush(timeout_millis)


def configure_telemetry(settings: Settings, app: FastAPI) -> None:
    """Export spans and metrics when a collector endpoint is set; otherwise stay no-op."""
    if not settings.otel_exporter_otlp_endpoint:
        return

    resource = Resource.create({"service.name": SERVICE_NAME, "service.version": app.version})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        ScrubbingSpanProcessor(
            BatchSpanProcessor(
                OTLPSpanExporter(
                    endpoint=settings.otel_exporter_otlp_endpoint,
                    timeout=settings.otel_export_timeout_seconds,
                )
            )
        )
    )
    trace.set_tracer_provider(provider)
    metrics.set_meter_provider(
        MeterProvider(
            resource=resource,
            views=_http_server_views(),
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
