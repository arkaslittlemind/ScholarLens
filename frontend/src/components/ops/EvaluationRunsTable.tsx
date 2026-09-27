import type { EvaluationRunSummary } from "@/lib/ops";
import { formatNumber, formatPercent, formatSeconds, formatTimestamp } from "@/lib/ops-format";

interface EvaluationRunsTableProps {
  runs: EvaluationRunSummary[];
}

function failureSummary(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (entries.length === 0) return "None";
  return entries.map(([category, count]) => `${category.replaceAll("_", " ")} ${count}`).join(", ");
}

export function EvaluationRunsTable({ runs }: EvaluationRunsTableProps) {
  if (runs.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-3xl border border-ink">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Recent evaluation runs, newest first</caption>
        <thead className="border-b border-ink">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Run at</th>
            <th scope="col" className="px-4 py-3 font-medium">Eligibility</th>
            <th scope="col" className="px-4 py-3 font-medium">Citation</th>
            <th scope="col" className="px-4 py-3 font-medium">Hallucination</th>
            <th scope="col" className="px-4 py-3 font-medium">Latency</th>
            <th scope="col" className="px-4 py-3 font-medium">Tool calls</th>
            <th scope="col" className="px-4 py-3 font-medium">Failures</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id} className="border-b border-ink/20 last:border-0">
              <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(run.run_at)}</td>
              <td className="px-4 py-3">{formatPercent(run.eligibility_accuracy)}</td>
              <td className="px-4 py-3">{formatPercent(run.citation_accuracy)}</td>
              <td className="px-4 py-3">{formatPercent(run.hallucination_rate)}</td>
              <td className="px-4 py-3">{formatSeconds(run.latency_ms)}</td>
              <td className="px-4 py-3">{formatNumber(run.tool_call_count, 1)}</td>
              <td className="px-4 py-3 text-graphite">{failureSummary(run.failure_counts)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
