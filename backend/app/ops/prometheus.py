"""Traffic trends for /ops, queried from Grafana Cloud's Prometheus API."""

import asyncio
import logging
import math
import time
from typing import Any

import httpx

from app.config import Settings, secret_value
from app.ops.summary import Point, Traffic, TrafficSeries

_logger = logging.getLogger(__name__)

_SEL = 'job="scholarlens-api"'
_ELIGIBILITY = f'{_SEL},http_target="/eligibility"'
_HTTP = "http_server_duration_milliseconds"

# Fixed strings: no request input ever reaches a query.
_QUERIES = {
    "request_rate": f"sum(rate({_HTTP}_count{{{_SEL}}}[5m]))",
    "error_ratio": (
        f'(sum(rate({_HTTP}_count{{{_SEL},http_status_code=~"5.."}}[5m])) or vector(0))'
        f" / sum(rate({_HTTP}_count{{{_SEL}}}[5m]))"
    ),
    "latency_p95_ms": (
        f"histogram_quantile(0.95, sum by (le) (rate({_HTTP}_bucket{{{_ELIGIBILITY}}}[5m])))"
    ),
    "latency_mean_ms": (
        f"sum(rate({_HTTP}_sum{{{_ELIGIBILITY}}}[5m]))"
        f" / sum(rate({_HTTP}_count{{{_ELIGIBILITY}}}[5m]))"
    ),
    "tool_calls_per_min": (
        f"sum by (app_tool_name) (rate(scholarlens_tool_calls_total{{{_SEL}}}[5m])) * 60"
    ),
}


class _QueryFailed(Exception):
    def __init__(self, status_code: int | None = None) -> None:
        super().__init__(status_code)
        self.status_code = status_code


def _points(values: list[list[Any]]) -> list[Point]:
    points: list[Point] = []
    for timestamp, raw in values:
        value = float(str(raw))
        points.append((int(float(str(timestamp))), value if math.isfinite(value) else None))
    return points


async def _query_range(
    client: httpx.AsyncClient, settings: Settings, query: str, start: int, end: int, step: int
) -> list[dict[str, Any]]:
    response = await client.get(
        f"{settings.grafana_prometheus_url}/api/v1/query_range",
        params={"query": query, "start": start, "end": end, "step": step},
    )
    if response.status_code != 200:
        raise _QueryFailed(response.status_code)
    body = response.json()
    result = body.get("data", {}).get("result") if isinstance(body, dict) else None
    if body.get("status") != "success" or not isinstance(result, list):
        raise _QueryFailed()
    return result


async def fetch_traffic(settings: Settings, window_seconds: int, step_seconds: int) -> Traffic:
    """The traffic section; degrades to not_configured or unavailable, never raises."""
    not_configured = Traffic(
        status="not_configured", window_seconds=window_seconds, step_seconds=step_seconds
    )
    token = secret_value(settings.grafana_prometheus_token)
    if not (settings.grafana_prometheus_url and settings.grafana_prometheus_user and token):
        return not_configured

    end = int(time.time())
    start = end - window_seconds
    try:
        async with httpx.AsyncClient(
            auth=(settings.grafana_prometheus_user, token),
            timeout=settings.grafana_query_timeout_seconds,
        ) as client:
            # httpx's timeout applies per phase, so a slowly streamed body could outlast it;
            # this caps the whole batch, since the queries run in parallel.
            async with asyncio.timeout(settings.grafana_query_timeout_seconds):
                results = await asyncio.gather(
                    *(
                        _query_range(client, settings, query, start, end, step_seconds)
                        for query in _QUERIES.values()
                    )
                )
        by_name = dict(zip(_QUERIES, results, strict=True))
        series = TrafficSeries(
            request_rate=_single(by_name["request_rate"]),
            error_ratio=_single(by_name["error_ratio"]),
            latency_p95_ms=_single(by_name["latency_p95_ms"]),
            latency_mean_ms=_single(by_name["latency_mean_ms"]),
            tool_calls_per_min={
                str(item["metric"].get("app_tool_name", "unknown")): _points(item["values"])
                for item in by_name["tool_calls_per_min"]
            },
        )
    except (
        httpx.HTTPError,
        TimeoutError,
        _QueryFailed,
        ValueError,
        KeyError,
        TypeError,
        AttributeError,
    ) as exc:
        # Type only: the URL carries the stack name and an httpx message can echo request details.
        _logger.warning(
            "grafana query failed",
            extra={
                "error_type": type(exc).__name__,
                "status_code": getattr(exc, "status_code", None),
            },
        )
        return not_configured.model_copy(update={"status": "unavailable"})
    return Traffic(
        status="ok", window_seconds=window_seconds, step_seconds=step_seconds, series=series
    )


def _single(result: list[dict[str, Any]]) -> list[Point]:
    # These queries aggregate to one series, or none when nothing was recorded in the window.
    return _points(result[0]["values"]) if result else []
