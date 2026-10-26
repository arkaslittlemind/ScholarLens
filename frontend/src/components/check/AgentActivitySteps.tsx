"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { displayLabel } from "@/lib/eligibility";

// Mirrors backend/app/agent/agent.py's trace constants verbatim: that file's comment
// marks these as user-facing labels this feature renders as-is, never paraphrased.
export const SEARCHING_PROGRAM_RULES = "searching program rules";
export const CHECKING_OFFICIAL_SOURCES = "checking official sources";
export const VALIDATING_ELIGIBILITY = "validating eligibility";
export const PREPARING_CITED_ANSWER = "preparing cited answer";

// Steps every real run reports (agent.py's system prompt requires retrieval first, and
// tool_trace always ends with these two). "checking official sources" is conditional on
// a web search happening, so it is never assumed during the simulated wait below; it
// only appears once a real tool_trace confirms it (see `completedSteps`).
const GUARANTEED_STEPS = [SEARCHING_PROGRAM_RULES, VALIDATING_ELIGIBILITY, PREPARING_CITED_ANSWER];

// Exported so a future test can control timing instead of depending on wall-clock delays.
export const STEP_INTERVAL_MS = 1400;

// The simulated steps finish in about 3 s, but a run that searches the web can take far
// longer (the backend allows 45 s). Past this point the card says why instead of going quiet.
export const SLOW_AFTER_MS = 12000;

interface AgentActivityStepsProps {
  // The real backend tool_trace, once known. When provided, this replaces the simulated
  // progression and every listed step renders as done. POST /eligibility is a single
  // synchronous call (no streaming), so this is the earliest point the real steps are known.
  completedSteps?: string[];
  intervalMs?: number;
  slowAfterMs?: number;
}

export function AgentActivitySteps({
  completedSteps,
  intervalMs = STEP_INTERVAL_MS,
  slowAfterMs = SLOW_AFTER_MS,
}: AgentActivityStepsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (completedSteps) return;
    const id = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(id);
  }, [completedSteps, slowAfterMs]);

  useEffect(() => {
    if (completedSteps) return;
    const id = setInterval(() => {
      setActiveIndex((index) => Math.min(index + 1, GUARANTEED_STEPS.length - 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [completedSteps, intervalMs]);

  const steps = completedSteps ?? GUARANTEED_STEPS;

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 shadow-card sm:p-8">
      <p className="font-display text-xl text-ink">Reading the rules for you</p>
      {/* Its own live region: the steps region below stays quiet once the last step is active. */}
      <p aria-live="polite" className="mt-1 text-sm text-ink-secondary">
        {slow
          ? "Still working. Checks that search the web can take up to a minute."
          : "This usually takes a few seconds."}
      </p>
      <div
        role="status"
        // False so each tick announces only the step that changed, not the whole list again.
        aria-atomic="false"
        className="mt-6 flex flex-col"
      >
        {steps.map((step, index) => {
          const isDone = completedSteps !== undefined || index < activeIndex;
          const isActive = completedSteps === undefined && index === activeIndex;
          const isLast = index === steps.length - 1;
          return (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-6 items-center justify-center rounded-full transition-colors duration-300 ${
                    isDone ? "bg-sage-tint text-sage-text" : isActive ? "bg-rust-tint text-rust-text" : "bg-tint text-ink-secondary/50"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  ) : isActive ? (
                    <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                  ) : (
                    <Circle aria-hidden="true" className="size-3" />
                  )}
                </span>
                {!isLast && (
                  <span aria-hidden="true" className="my-1 w-px flex-1 bg-hairline">
                    <span
                      className={`block h-full w-full origin-top bg-sage transition-transform duration-300 ease-out-strong motion-reduce:transition-none ${isDone ? "scale-y-100" : "scale-y-0"}`}
                    />
                  </span>
                )}
              </div>
              <span
                className={`text-body-sm leading-6 transition-colors duration-300 ${isLast ? "" : "pb-5"} ${
                  isDone || isActive ? "font-medium text-ink" : "text-ink-secondary"
                }`}
              >
                {displayLabel(step)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
