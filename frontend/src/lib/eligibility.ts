// Mirrors backend/app/api/models.py's EligibilityRequest.
export interface EligibilityRequest {
  description: string;
  income?: number;
  state?: string;
  gpa?: number;
  major?: string;
}

// Mirrors backend/app/agent/models.py's EligibilityStatus / Source / EligibilityResult.
export type EligibilityStatus = "eligible" | "partial" | "not_eligible";

export interface Source {
  program: string;
  document: string;
  url: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  explanation: string;
  supporting_clause: string | null;
  source: Source | null;
  missing_info: string[];
  // Present on the wire but not rendered by this feature - see feature 11.
  tool_trace: string[];
}

// Mirrors backend/app/api/errors.py's ErrorDetail / ErrorResponse.
export interface ErrorDetail {
  code: string;
  message: string;
  fields: string[];
}

export interface ErrorResponse {
  error: ErrorDetail;
}

// Longer than the backend's own agent_run_timeout_seconds (45s, backend/app/config.py)
// so a legitimately slow-but-successful run isn't cut off before the server gives up.
const REQUEST_TIMEOUT_MS = 60_000;

export class EligibilityClientError extends Error {
  constructor(
    public readonly kind: "api" | "network" | "timeout",
    public readonly detail?: ErrorDetail,
    public readonly status?: number,
  ) {
    super(detail?.message ?? kind);
    this.name = "EligibilityClientError";
  }
}

const UNEXPECTED_SHAPE_DETAIL: ErrorDetail = {
  code: "internal_error",
  message: "The server returned an unexpected response.",
  fields: [],
};

const STATUSES: EligibilityStatus[] = ["eligible", "partial", "not_eligible"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSource(value: unknown): value is Source {
  return (
    isRecord(value) &&
    typeof value.program === "string" &&
    typeof value.document === "string" &&
    typeof value.url === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isErrorDetail(value: unknown): value is ErrorDetail {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    isStringArray(value.fields)
  );
}

// Trusts the wire only after every field matches the shape backend/app/agent/models.py
// defines - a malformed response degrades to the existing error path instead of
// rendering `undefined`s or crashing a component.
function isEligibilityResult(value: unknown): value is EligibilityResult {
  if (!isRecord(value)) return false;
  const result = value;
  return (
    STATUSES.includes(result.status as EligibilityStatus) &&
    typeof result.explanation === "string" &&
    (result.supporting_clause === null || typeof result.supporting_clause === "string") &&
    (result.source === null || isSource(result.source)) &&
    isStringArray(result.missing_info) &&
    isStringArray(result.tool_trace)
  );
}

export async function checkEligibility(request: EligibilityRequest): Promise<EligibilityResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new EligibilityClientError("timeout");
    }
    throw new EligibilityClientError("network");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail: ErrorDetail = {
      code: "internal_error",
      message: "The server encountered an unexpected error.",
      fields: [],
    };
    try {
      const body: unknown = await response.json();
      if (typeof body === "object" && body !== null && isErrorDetail((body as ErrorResponse).error)) {
        detail = (body as ErrorResponse).error;
      }
    } catch {
      // Non-JSON body: keep the internal_error fallback above.
    }
    throw new EligibilityClientError("api", detail, response.status);
  }

  const body: unknown = await response.json();
  if (!isEligibilityResult(body)) {
    throw new EligibilityClientError("api", UNEXPECTED_SHAPE_DETAIL);
  }
  return body;
}
