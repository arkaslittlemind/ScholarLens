// Server-only: reads OPS_API_TOKEN, which has no NEXT_PUBLIC_ prefix and so never
// reaches the browser bundle. Import it from server components only.

// Mirrors backend/app/ops/summary.py. A point is [unix seconds, value]; null is "no value".
export type Point = [number, number | null];

export interface TrafficSeries {
  request_rate: Point[];
  error_ratio: Point[];
  latency_p95_ms: Point[];
  latency_mean_ms: Point[];
  tool_calls_per_min: Record<string, Point[]>;
}

export type TrafficStatus = "ok" | "not_configured" | "unavailable";

export interface Traffic {
  status: TrafficStatus;
  window_seconds: number;
  step_seconds: number;
  series: TrafficSeries | null;
}

export interface EvaluationRunSummary {
  run_id: string;
  run_at: string;
  agent_model: string;
  profile_count: number;
  repeats: number;
  eligibility_accuracy: number;
  citation_accuracy: number | null;
  hallucination_rate: number | null;
  consistency_score: number | null;
  tool_call_count: number;
  latency_ms: number;
  failure_counts: Record<string, number>;
}

export interface IngestionSummary {
  run_id: string;
  status: "succeeded" | "failed";
  started_at: string;
  finished_at: string;
  embedding_model: string;
  document_count: number;
  chunk_count: number;
}

export interface OpsSummary {
  generated_at: string;
  traffic: Traffic;
  evaluation: { runs: EvaluationRunSummary[] };
  ingestion: IngestionSummary | null;
}

export type OpsResult =
  | { kind: "ok"; summary: OpsSummary }
  | { kind: "not_configured" | "rejected" | "unavailable" };

// Longer than the backend's per-query Grafana timeout (5s), which runs its queries in parallel.
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isPoints(value: unknown): value is Point[] {
  return (
    Array.isArray(value) &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        isNumberOrNull(point[1]),
    )
  );
}

function isTrafficSeries(value: unknown): value is TrafficSeries {
  return (
    isRecord(value) &&
    isPoints(value.request_rate) &&
    isPoints(value.error_ratio) &&
    isPoints(value.latency_p95_ms) &&
    isPoints(value.latency_mean_ms) &&
    isRecord(value.tool_calls_per_min) &&
    Object.values(value.tool_calls_per_min).every(isPoints)
  );
}

function isTraffic(value: unknown): value is Traffic {
  return (
    isRecord(value) &&
    (value.status === "ok" ||
      value.status === "not_configured" ||
      value.status === "unavailable") &&
    typeof value.window_seconds === "number" &&
    typeof value.step_seconds === "number" &&
    (value.series === null || isTrafficSeries(value.series))
  );
}

function isRun(value: unknown): value is EvaluationRunSummary {
  return (
    isRecord(value) &&
    typeof value.run_id === "string" &&
    typeof value.run_at === "string" &&
    typeof value.agent_model === "string" &&
    typeof value.profile_count === "number" &&
    typeof value.repeats === "number" &&
    typeof value.eligibility_accuracy === "number" &&
    isNumberOrNull(value.citation_accuracy) &&
    isNumberOrNull(value.hallucination_rate) &&
    isNumberOrNull(value.consistency_score) &&
    typeof value.tool_call_count === "number" &&
    typeof value.latency_ms === "number" &&
    isRecord(value.failure_counts) &&
    Object.values(value.failure_counts).every((count) => typeof count === "number")
  );
}

function isIngestion(value: unknown): value is IngestionSummary {
  return (
    isRecord(value) &&
    typeof value.run_id === "string" &&
    (value.status === "succeeded" || value.status === "failed") &&
    typeof value.started_at === "string" &&
    typeof value.finished_at === "string" &&
    typeof value.embedding_model === "string" &&
    typeof value.document_count === "number" &&
    typeof value.chunk_count === "number"
  );
}

function isOpsSummary(value: unknown): value is OpsSummary {
  return (
    isRecord(value) &&
    typeof value.generated_at === "string" &&
    isTraffic(value.traffic) &&
    isRecord(value.evaluation) &&
    Array.isArray(value.evaluation.runs) &&
    value.evaluation.runs.every(isRun) &&
    (value.ingestion === null || isIngestion(value.ingestion))
  );
}

export async function fetchOpsSummary(): Promise<OpsResult> {
  const token = process.env.OPS_API_TOKEN;
  if (!token) return { kind: "not_configured" };
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/ops/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.status === 401) return { kind: "rejected" };
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const code = isRecord(body) && isRecord(body.error) ? body.error.code : null;
    return { kind: code === "ops_not_configured" ? "not_configured" : "unavailable" };
  }

  const body: unknown = await response.json().catch(() => null);
  return isOpsSummary(body) ? { kind: "ok", summary: body } : { kind: "unavailable" };
}
