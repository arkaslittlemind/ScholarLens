"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { AgentActivitySteps } from "@/components/check/AgentActivitySteps";
import { EligibilityForm } from "@/components/check/EligibilityForm";
import { EASE_OUT } from "@/components/motion/easing";
import { statusLabel, VerdictCard } from "@/components/check/VerdictCard";
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

function describeWait(seconds: number | undefined): string {
  if (seconds === undefined) return "later";
  if (seconds <= 60) return "in about a minute";
  if (seconds < 3600) return `in about ${Math.ceil(seconds / 60)} minutes`;
  const hours = Math.ceil(seconds / 3600);
  return `in about ${hours} hour${hours > 1 ? "s" : ""}`;
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
    if (error.detail?.code === "engine_busy") {
      // The model provider is rate limiting us: not an outage, so say when to come back.
      return {
        message: `The eligibility engine is busy right now. Please try again ${describeWait(error.retryAfterSeconds)}.`,
      };
    }
    if (error.detail?.code === "engine_unavailable") {
      return { message: "The eligibility engine is temporarily unavailable. Please try again shortly." };
    }
    if (error.detail?.code === "rate_limited") {
      return {
        message: `You've reached the limit for eligibility checks. Please try again ${describeWait(error.retryAfterSeconds)}.`,
      };
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

  const resultRef = useRef<HTMLDivElement>(null);

  // On a phone the result renders below the fold; bring it up without moving focus,
  // since the live region below already announces it. A result that already starts
  // in the upper part of the screen is left where it is.
  useEffect(() => {
    const result = resultRef.current;
    if (!mutation.isSuccess || !result) return;
    if (result.getBoundingClientRect().top < window.innerHeight * 0.6) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [mutation.isSuccess]);

  function handleSubmit(request: EligibilityRequest) {
    mutation.reset();
    mutation.mutate(request);
  }

  // The form keeps its values, so the student adds to what they wrote rather than starting over.
  function handleAddDetails() {
    const description = document.querySelector<HTMLTextAreaElement>("#description");
    if (!description) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    description.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    description.focus({ preventScroll: true });
    description.setSelectionRange(description.value.length, description.value.length);
  }

  const errorInfo = mutation.isError ? describeError(mutation.error) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <EligibilityForm
        onSubmit={handleSubmit}
        disabled={mutation.isPending}
        serverFieldErrors={errorInfo?.fields}
      />

      <div ref={resultRef} className="scroll-mt-24">
        {/* "wait" lets the activity card leave before the verdict arrives, so the
            two never stack and jump the layout. Exit is quicker than enter. */}
        <AnimatePresence mode="wait" initial={false}>
          {mutation.isPending && (
            <motion.div
              key="activity"
              className="motion-reduce:transform-none!"
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)", transition: { duration: 0.3, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
            >
              <AgentActivitySteps />
            </motion.div>
          )}
          {mutation.isSuccess && <VerdictCard key="verdict" result={mutation.data} onAddDetails={handleAddDetails} />}
        </AnimatePresence>
      </div>

      {/* Always mounted, so screen readers announce the text when it changes.
          Not role="status": the activity list already uses that role. */}
      <p aria-live="polite" data-testid="result-announcement" className="sr-only">
        {mutation.isSuccess ? `Result ready: ${statusLabel(mutation.data.status)}.` : ""}
      </p>

      {errorInfo && (
        // Enters from @starting-style, so a message that appears is bridged without JS.
        <div className="flex gap-3 rounded-xl border border-rust/40 bg-rust-tint/60 p-4 transition-[opacity,translate] duration-200 ease-out-strong starting:-translate-y-1 starting:opacity-0 motion-reduce:translate-none!">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
          <p role="alert" className="text-body-sm font-medium text-ink">
            {errorInfo.message}
          </p>
        </div>
      )}
    </div>
  );
}
