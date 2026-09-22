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
    let detail: ErrorDetail;
    try {
      const body = (await response.json()) as ErrorResponse;
      detail = body.error;
    } catch {
      detail = {
        code: "internal_error",
        message: "The server encountered an unexpected error.",
        fields: [],
      };
    }
    throw new EligibilityClientError("api", detail, response.status);
  }

  return (await response.json()) as EligibilityResult;
}
