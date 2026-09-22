"use client";

import { useState } from "react";
import { EligibilityForm } from "@/components/check/EligibilityForm";
import { VerdictCard } from "@/components/check/VerdictCard";
import {
  checkEligibility,
  EligibilityClientError,
  type EligibilityRequest,
  type EligibilityResult,
} from "@/lib/eligibility";

type CheckState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: EligibilityResult }
  | { status: "error"; message: string };

function messageFor(error: unknown): string {
  if (error instanceof EligibilityClientError) {
    if (error.kind === "timeout") {
      return "That's taking longer than expected. Please try again in a moment.";
    }
    if (error.kind === "network") {
      return "Couldn't reach the eligibility service. Check your connection and try again.";
    }
    if (error.detail?.code === "engine_unavailable") {
      return "The eligibility engine is temporarily unavailable. Please try again shortly.";
    }
    if (error.detail?.code === "validation_error" && error.detail.fields.length > 0) {
      return `Please check: ${error.detail.fields.join(", ")}.`;
    }
  }
  return "Something went wrong. Please try again.";
}

export function EligibilityChecker() {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  async function handleSubmit(request: EligibilityRequest) {
    setState({ status: "loading" });
    try {
      const result = await checkEligibility(request);
      setState({ status: "success", result });
    } catch (error) {
      setState({ status: "error", message: messageFor(error) });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <EligibilityForm onSubmit={handleSubmit} disabled={state.status === "loading"} />

      {state.status === "loading" && (
        <p role="status" className="text-base text-graphite">
          Checking eligibility...
        </p>
      )}

      {state.status === "success" && <VerdictCard result={state.result} />}

      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-ink p-4 text-base text-ink">
          {state.message}
        </p>
      )}
    </div>
  );
}
