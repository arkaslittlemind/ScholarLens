import { OpsHeader } from "@/components/ops/OpsHeader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 pb-24">
        <h1 className="text-3xl font-medium">Operations</h1>
        <p role="status" className="text-ink-secondary">
          Loading traffic, evaluation, and ingestion data...
        </p>
      </main>
    </div>
  );
}
