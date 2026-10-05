import type { IngestionSummary } from "@/lib/ops";
import { formatAge, formatTimestamp } from "@/lib/ops-format";

interface IngestionHealthProps {
  ingestion: IngestionSummary | null;
  now: Date;
}

export function IngestionHealth({ ingestion, now }: IngestionHealthProps) {
  if (!ingestion) {
    return (
      <p className="rounded-3xl border border-hairline p-6 text-ink-secondary">
        Never ingested. Run <code>python -m app.ingestion</code> in <code>backend/</code> to
        build the knowledge base.
      </p>
    );
  }

  const succeeded = ingestion.status === "succeeded";
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-hairline p-6">
      <p className="flex items-center gap-2 text-lg font-medium">
        <span
          aria-hidden
          className={`size-2.5 rounded-full ${succeeded ? "bg-sage" : "bg-destructive"}`}
        />
        <span className={succeeded ? "" : "text-destructive"}>
          Last ingestion {succeeded ? "succeeded" : "failed"}
        </span>
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
        <div>
          <dt className="text-ink-secondary">Finished</dt>
          <dd>
            {formatTimestamp(ingestion.finished_at)} ({formatAge(ingestion.finished_at, now)})
          </dd>
        </div>
        <div>
          <dt className="text-ink-secondary">Documents</dt>
          <dd>{ingestion.document_count}</dd>
        </div>
        <div>
          <dt className="text-ink-secondary">Chunks</dt>
          <dd>{ingestion.chunk_count}</dd>
        </div>
        <div>
          <dt className="text-ink-secondary">Embedding model</dt>
          <dd>{ingestion.embedding_model}</dd>
        </div>
      </dl>
      {!succeeded && (
        <p className="text-sm text-ink-secondary">
          The error detail stays in the backend status file and logs.
        </p>
      )}
    </div>
  );
}
