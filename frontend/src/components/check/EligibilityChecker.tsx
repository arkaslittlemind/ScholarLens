"use client";

import { useState } from "react";
import { AgentActivitySteps } from "@/components/check/AgentActivitySteps";
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
  | { status: "error"; message: string; fields?: string[] };

function describeError(error: unknown): { message: string; fields?: string[] } {
  if (error instanceof EligibilityClientError) {
    if (error.kind === "timeout") {
      return { message: "That's taking longer than expected. Please try again in a moment." };
    }
    if (error.kind === "network") {
      return {
        message: "Couldn't reach the eligibility service. Check your connection and try again.",
      };
    }
    if (error.detail?.code === "engine_unavailable") {
      return { message: "The eligibility engine is temporarily unavailable. Please try again shortly." };
    }
    if (error.detail?.code === "validation_error" && error.detail.fields.length > 0) {
      return {
        message: `Please check the highlighted field${error.detail.fields.length > 1 ? "s" : ""}.`,
        fields: error.detail.fields,
      };
    }
  }
  return { message: "Something went wrong. Please try again." };
}

export function EligibilityChecker() {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  async function handleSubmit(request: EligibilityRequest) {
    setState({ status: "loading" });
    try {
      const result = await checkEligibility(request);
      setState({ status: "success", result });
    } catch (error) {
      setState({ status: "error", ...describeError(error) });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <EligibilityForm
        onSubmit={handleSubmit}
        disabled={state.status === "loading"}
        serverFieldErrors={state.status === "error" ? state.fields : undefined}
      />

      {state.status === "loading" && <AgentActivitySteps />}

      {state.status === "success" && <VerdictCard result={state.result} />}

      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-ink p-4 text-base text-ink">
          {state.message}
        </p>
      )}
    </div>
  );
}
