import type { Metadata } from "next";
import { connection } from "next/server";
import { EvaluationRunsTable } from "@/components/ops/EvaluationRunsTable";
import { EvaluationSummary } from "@/components/ops/EvaluationSummary";
import { IngestionHealth } from "@/components/ops/IngestionHealth";
import { OpsHeader } from "@/components/ops/OpsHeader";
import { OpsUnavailable } from "@/components/ops/OpsUnavailable";
import { TrafficSection } from "@/components/ops/TrafficSection";
import { fetchOpsSummary } from "@/lib/ops";

export const metadata: Metadata = {
  title: "Operations - ScholarLens",
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default async function Ops() {
  // Live data on every request; never prerendered at build time.
  await connection();
  const result = await fetchOpsSummary();
  const now = new Date();

  return (
    <div className="min-h-screen bg-cream-paper text-ink">
      <OpsHeader generatedAt={result.kind === "ok" ? result.summary.generated_at : undefined} />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-16 px-6 pb-24">
        <h1 className="text-3xl font-medium">Operations</h1>
        {result.kind === "ok" ? (
          <>
            <Section title="Traffic">
              <TrafficSection traffic={result.summary.traffic} />
            </Section>
            <Section title="Evaluation">
              <EvaluationSummary runs={result.summary.evaluation.runs} now={now} />
              <EvaluationRunsTable runs={result.summary.evaluation.runs} />
            </Section>
            <Section title="Ingestion">
              <IngestionHealth ingestion={result.summary.ingestion} now={now} />
            </Section>
          </>
        ) : (
          <OpsUnavailable kind={result.kind} />
        )}
      </main>
    </div>
  );
}
