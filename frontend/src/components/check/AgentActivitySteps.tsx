"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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

function displayLabel(step: string): string {
  return step.charAt(0).toUpperCase() + step.slice(1);
}

interface AgentActivityStepsProps {
  // The real backend tool_trace, once known. When provided, this replaces the simulated
  // progression and every listed step renders as done. POST /eligibility is a single
  // synchronous call (no streaming), so this is the earliest point the real steps are known.
  completedSteps?: string[];
  intervalMs?: number;
}

export function AgentActivitySteps({ completedSteps, intervalMs = STEP_INTERVAL_MS }: AgentActivityStepsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (completedSteps) return;
    const id = setInterval(() => {
      setActiveIndex((index) => Math.min(index + 1, GUARANTEED_STEPS.length - 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [completedSteps, intervalMs]);

  const steps = completedSteps ?? GUARANTEED_STEPS;

  return (
    <div
      role="status"
      // False so each tick announces only the step that changed, not the whole list again.
      aria-atomic="false"
      className="flex flex-col gap-3 rounded-3xl border border-ink bg-cream-paper p-6"
    >
      {steps.map((step, index) => {
        const isDone = completedSteps !== undefined || index < activeIndex;
        const isActive = completedSteps === undefined && index === activeIndex;
        return (
          <div key={step} className="flex items-center gap-3 text-base">
            {isDone ? (
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-ink" />
            ) : isActive ? (
              <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-ink" />
            ) : (
              <Circle aria-hidden="true" className="size-4 shrink-0 text-graphite" />
            )}
            <span className={isDone || isActive ? "text-ink" : "text-graphite"}>{displayLabel(step)}</span>
          </div>
        );
      })}
    </div>
  );
}
