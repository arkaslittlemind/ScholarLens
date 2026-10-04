import { CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { displayLabel, type EligibilityResult, type EligibilityStatus, type Source } from "@/lib/eligibility";

// Renders arbitrary model/web-search output (explanation, supporting_clause) as
// plain React text children only - never dangerouslySetInnerHTML.

// Fills come from the existing palette only (feature 10's no-new-colors rule).
// The icon and label always carry the meaning too, so color is never the only cue.
const STATUS_META: Record<
  EligibilityStatus,
  { label: string; icon: typeof CheckCircle2; badgeClassName: string }
> = {
  eligible: {
    label: "Eligible",
    icon: CheckCircle2,
    badgeClassName: "border-mint-signal bg-mint-signal text-ink",
  },
  partial: {
    label: "Partial match",
    icon: CircleDot,
    badgeClassName: "border-sunshine-highlight bg-sunshine-highlight text-ink",
  },
  not_eligible: {
    label: "Not eligible",
    icon: XCircle,
    badgeClassName: "border-ink bg-cream-paper text-ink",
  },
};

export function statusLabel(status: EligibilityStatus): string {
  return STATUS_META[status].label;
}

// F-13 (blueprint/context/findings.md): source.url is untrusted web/retrieval
// content with no backend scheme validation. Only ever render it as a navigable
// link when it's actually http(s); otherwise show it as inert text.
function safeHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

interface SectionHeadingProps {
  id: string;
  children: string;
}

function SectionHeading({ id, children }: SectionHeadingProps) {
  return (
    <h3 id={id} className="text-sm font-medium text-ink">
      {children}
    </h3>
  );
}

interface VerdictRuleProps {
  clause: string | null;
  source: Source | null;
}

function VerdictRule({ clause, source }: VerdictRuleProps) {
  if (!clause) {
    return <p className="text-sm text-graphite">No rule was quoted. This result rests on missing information.</p>;
  }
  return (
    <figure aria-labelledby="verdict-rule" className="flex flex-col gap-2">
      <SectionHeading id="verdict-rule">The rule</SectionHeading>
      <blockquote className="border-l-2 border-ink pl-4 text-base text-ink wrap-anywhere">
        &ldquo;{clause}&rdquo;
      </blockquote>
      {source && <figcaption className="pl-4 text-sm text-graphite wrap-anywhere">{source.document}</figcaption>}
    </figure>
  );
}

interface VerdictSourceProps {
  source: Source | null;
}

function VerdictSource({ source }: VerdictSourceProps) {
  if (!source) {
    return <p className="text-sm text-graphite">No source document was cited for this result.</p>;
  }
  const httpUrl = safeHttpUrl(source.url);
  return (
    <section aria-labelledby="verdict-source" className="flex flex-col gap-1 text-sm wrap-anywhere">
      <SectionHeading id="verdict-source">Source</SectionHeading>
      <p className="text-ink">{source.program}</p>
      <p className="text-graphite">{source.document}</p>
      {httpUrl ? (
        // The raw string, not httpUrl.href: the check above already proved it is
        // http(s), and href normalization would change what the backend sent.
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="w-fit text-ink underline underline-offset-4">
          Open source on {httpUrl.hostname}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <p className="text-graphite">{source.url}</p>
      )}
    </section>
  );
}

interface VerdictTraceProps {
  steps: string[];
}

function VerdictTrace({ steps }: VerdictTraceProps) {
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading id="verdict-trace">How this answer was found</SectionHeading>
      {/* A plain list on purpose: the in-flight steps already announced as a
          status region, and a second one would repeat them. */}
      <ol aria-labelledby="verdict-trace" className="flex flex-col gap-1 text-sm text-graphite">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-ink" />
            {displayLabel(step)}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface VerdictCardProps {
  result: EligibilityResult;
}

export function VerdictCard({ result }: VerdictCardProps) {
  const meta = STATUS_META[result.status];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-ink bg-cream-paper p-8">
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-2xl font-medium text-ink wrap-anywhere">
          {result.source ? result.source.program : "Your result"}
        </h2>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${meta.badgeClassName}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {meta.label}
        </div>
      </div>

      <p className="text-lg text-ink">{result.explanation}</p>

      <VerdictRule clause={result.supporting_clause} source={result.source} />

      <VerdictSource source={result.source} />

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

      <VerdictTrace steps={result.tool_trace} />

      <p className="text-sm text-graphite">
        ScholarLens checks eligibility rules, not your chances of an award. Confirm details with the
        program before applying.
      </p>
    </div>
  );
}
