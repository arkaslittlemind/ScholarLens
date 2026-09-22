import { CheckCircle2, CircleDot, XCircle } from "lucide-react";
import type { EligibilityResult, EligibilityStatus } from "@/lib/eligibility";

// Renders arbitrary model/web-search output (explanation, supporting_clause) as
// plain React text children only - never dangerouslySetInnerHTML.

const STATUS_META: Record<
  EligibilityStatus,
  { label: string; icon: typeof CheckCircle2; badgeClassName: string }
> = {
  eligible: {
    label: "Eligible",
    icon: CheckCircle2,
    badgeClassName: "border-mint-signal text-ink",
  },
  partial: {
    label: "Partial match",
    icon: CircleDot,
    badgeClassName: "border-ink text-ink",
  },
  not_eligible: {
    label: "Not eligible",
    icon: XCircle,
    badgeClassName: "border-ink text-ink",
  },
};

// F-13 (blueprint/context/findings.md): source.url is untrusted web/retrieval
// content with no backend scheme validation. Only ever render it as a navigable
// link when it's actually http(s); otherwise show it as inert text.
function safeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

interface VerdictCardProps {
  result: EligibilityResult;
}

export function VerdictCard({ result }: VerdictCardProps) {
  const meta = STATUS_META[result.status];
  const Icon = meta.icon;
  const linkableUrl = result.source ? safeHttpUrl(result.source.url) : null;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-ink bg-cream-paper p-8">
      <div
        className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${meta.badgeClassName}`}
      >
        <Icon aria-hidden="true" className="size-4" />
        {meta.label}
      </div>

      <p className="text-lg text-ink">{result.explanation}</p>

      {result.supporting_clause && (
        <blockquote className="rounded-md border border-ink bg-cream-paper p-4 text-base text-graphite italic">
          &ldquo;{result.supporting_clause}&rdquo;
        </blockquote>
      )}

      {result.source && (
        <p className="text-sm text-graphite">
          Source: {result.source.program} - {result.source.document}
          {linkableUrl ? (
            <>
              {" "}
              (
              <a href={linkableUrl} target="_blank" rel="noopener noreferrer" className="underline">
                view source
              </a>
              )
            </>
          ) : (
            <> ({result.source.url})</>
          )}
        </p>
      )}

      {result.missing_info.length > 0 && (
        <div className="rounded-md border border-ink p-4">
          <p className="text-sm font-medium text-ink">
            This result may change with more information:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-graphite">
            {result.missing_info.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
