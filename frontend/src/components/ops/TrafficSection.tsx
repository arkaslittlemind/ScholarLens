import type { Traffic } from "@/lib/ops";
import { TrendChart } from "./TrendChart";

interface TrafficSectionProps {
  traffic: Traffic;
}

const MESSAGES: Record<Exclude<Traffic["status"], "ok">, string> = {
  not_configured:
    "Trends need a read-only Grafana Cloud login on the backend (GRAFANA_PROMETHEUS_URL, _USER, _TOKEN).",
  unavailable:
    "Grafana Cloud did not answer in time or rejected the query. Reload to try again.",
};

export function TrafficSection({ traffic }: TrafficSectionProps) {
  const { series } = traffic;
  if (traffic.status !== "ok" || !series) {
    const status = traffic.status === "ok" ? "unavailable" : traffic.status;
    return (
      <p className="rounded-3xl border border-hairline p-6 text-ink-secondary">
        {MESSAGES[status]} The Service health dashboard in Grafana shows the same data.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-secondary">
        Last {traffic.window_seconds / 3600} hours, {traffic.step_seconds / 60}-minute steps,
        times in UTC.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendChart
          title="Request rate"
          unit="requests per second"
          format="reqps"
          series={[{ name: "requests", points: series.request_rate }]}
        />
        <TrendChart
          title="5xx error ratio"
          unit="share of requests"
          format="percent"
          series={[{ name: "5xx", points: series.error_ratio }]}
        />
        <TrendChart
          title="/eligibility latency"
          unit="seconds"
          format="ms"
          series={[
            { name: "p95", points: series.latency_p95_ms },
            { name: "mean", points: series.latency_mean_ms },
          ]}
        />
        <TrendChart
          title="Tool calls"
          unit="calls per minute"
          format="per-minute"
          series={Object.entries(series.tool_calls_per_min).map(([name, points]) => ({
            name,
            points,
          }))}
        />
      </div>
    </div>
  );
}
