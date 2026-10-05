import { formatTimestamp } from "@/lib/ops-format";

interface OpsHeaderProps {
  generatedAt?: string;
}

// Deliberately not SiteHeader: no student call to action on the internal view.
export function OpsHeader({ generatedAt }: OpsHeaderProps) {
  return (
    <header className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-2 px-6 py-8">
      <span className="text-lg font-medium">
        ScholarLens <span className="text-ink-secondary">/ Operations</span>
      </span>
      {generatedAt && (
        <span className="text-sm text-ink-secondary">
          Updated {formatTimestamp(generatedAt)}. Reload for fresh data.
        </span>
      )}
    </header>
  );
}
