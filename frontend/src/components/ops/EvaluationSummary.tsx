import type { EvaluationRunSummary } from "@/lib/ops";
import {
  formatAge,
  formatNumber,
  formatPercent,
  formatSeconds,
  formatTimestamp,
  meetsTarget,
  type TargetDirection,
} from "@/lib/ops-format";

interface Target {
  value: number;
  direction: TargetDirection;
  label: string;
}

interface TileProps {
  label: string;
  value: string;
  target?: Target;
  met?: boolean | null;
}

function Tile({ label, value, target, met }: TileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-ink p-5">
      <span className="text-sm text-graphite">{label}</span>
      <span
        className={`text-3xl font-medium ${met === false ? "text-destructive" : ""}`}
      >
        {value}
      </span>
      {target && (
        <span className="flex items-center gap-2 text-sm text-graphite">
          {met === true && (
            <span aria-hidden className="size-2 rounded-full bg-mint-signal" />
          )}
          {target.label}
          {met === true && " (met)"}
          {met === false && " (missed)"}
        </span>
      )}
    </div>
  );
}

interface EvaluationSummaryProps {
  runs: EvaluationRunSummary[];
  now: Date;
}

// Targets from the build plan: >80% eligibility, >70% citation, <10% hallucination.
const ELIGIBILITY: Target = { value: 0.8, direction: "at-least", label: "Target 80% or more" };
const CITATION: Target = { value: 0.7, direction: "at-least", label: "Target 70% or more" };
const HALLUCINATION: Target = { value: 0.1, direction: "at-most", label: "Target 10% or less" };

export function EvaluationSummary({ runs, now }: EvaluationSummaryProps) {
  const latest = runs[0];
  if (!latest) {
    return (
      <p className="rounded-3xl border border-ink p-6 text-graphite">
        No evaluation runs yet. Run <code>python -m app.evaluation</code> in{" "}
        <code>backend/</code> to record one.
      </p>
    );
  }

  const judged = (value: number | null, target: Target) =>
    meetsTarget(value, target.value, target.direction);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-graphite">
        Latest run {formatTimestamp(latest.run_at)} ({formatAge(latest.run_at, now)}),{" "}
        {latest.profile_count} profiles x {latest.repeats}, model {latest.agent_model}.
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Tile
          label="Eligibility accuracy"
          value={formatPercent(latest.eligibility_accuracy)}
          target={ELIGIBILITY}
          met={judged(latest.eligibility_accuracy, ELIGIBILITY)}
        />
        <Tile
          label="Citation accuracy"
          value={formatPercent(latest.citation_accuracy)}
          target={CITATION}
          met={judged(latest.citation_accuracy, CITATION)}
        />
        <Tile
          label="Hallucination rate"
          value={formatPercent(latest.hallucination_rate)}
          target={HALLUCINATION}
          met={judged(latest.hallucination_rate, HALLUCINATION)}
        />
        <Tile label="Consistency" value={formatPercent(latest.consistency_score)} />
        <Tile label="Mean latency per attempt" value={formatSeconds(latest.latency_ms)} />
        <Tile label="Mean tool calls per attempt" value={formatNumber(latest.tool_call_count, 1)} />
      </div>
    </div>
  );
}
