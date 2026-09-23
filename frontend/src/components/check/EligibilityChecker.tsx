"use client";

import { useMutation } from "@tanstack/react-query";
import { AgentActivitySteps } from "@/components/check/AgentActivitySteps";
import { EligibilityForm } from "@/components/check/EligibilityForm";
import { VerdictCard } from "@/components/check/VerdictCard";
import {
  checkEligibility,
  EligibilityClientError,
  type EligibilityRequest,
  type EligibilityResult,
} from "@/lib/eligibility";

// Retry only a transport failure (the request never reached the server, or
// timed out client-side). A response the server already sent back - 422, 503,
// or any other non-2xx - never auto-retries: resubmitting an already-answered
// request just repeats a paid LLM call with no reason to expect a different
// outcome. The form stays enabled so the user can resubmit manually anytime.
const MAX_TRANSPORT_RETRIES = 2;

function isRetryableTransportError(error: EligibilityClientError): boolean {
  return error.kind === "network" || error.kind === "timeout";
}

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
  const mutation = useMutation<EligibilityResult, EligibilityClientError, EligibilityRequest>({
    mutationFn: checkEligibility,
    retry: (failureCount, error) =>
      failureCount < MAX_TRANSPORT_RETRIES && isRetryableTransportError(error),
    // TanStack Query calls this with the pre-increment failure count (0, then 1),
    // so +1 is needed to get 1s then 2s rather than 0s then 1s.
    retryDelay: (failureCount) => (failureCount + 1) * 1000,
  });

  function handleSubmit(request: EligibilityRequest) {
    mutation.reset();
    mutation.mutate(request);
  }

  const errorInfo = mutation.isError ? describeError(mutation.error) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <EligibilityForm
        onSubmit={handleSubmit}
        disabled={mutation.isPending}
        serverFieldErrors={errorInfo?.fields}
      />

      {mutation.isPending && <AgentActivitySteps />}

      {mutation.isSuccess && <VerdictCard result={mutation.data} />}

      {errorInfo && (
        <p role="alert" className="rounded-md border border-ink p-4 text-base text-ink">
          {errorInfo.message}
        </p>
      )}
    </div>
  );
}
