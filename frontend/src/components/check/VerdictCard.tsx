"use client";

import { ArrowUpRight, CheckCircle2, CircleDot, Info, XCircle } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { EASE_IN_OUT, EASE_OUT } from "@/components/motion/easing";
import { displayLabel, type EligibilityResult, type EligibilityStatus, type Source } from "@/lib/eligibility";

// Renders arbitrary model/web-search output (explanation, supporting_clause) as
// plain React text children only - never dangerouslySetInnerHTML.

// The icon and label always carry the meaning too, so color is never the only cue.
const STATUS_META: Record<
  EligibilityStatus,
  { label: string; icon: typeof CheckCircle2; badgeClassName: string; headerClassName: string }
> = {
  eligible: {
    label: "Eligible",
    icon: CheckCircle2,
    badgeClassName: "bg-sage-tint text-sage-text",
    headerClassName: "bg-sage-tint/50",
  },
  partial: {
    label: "Partial match",
    icon: CircleDot,
    badgeClassName: "bg-rust-tint text-rust-text",
    headerClassName: "bg-rust-tint/50",
  },
  not_eligible: {
    label: "Not eligible",
    icon: XCircle,
    badgeClassName: "border border-input bg-paper text-ink",
    headerClassName: "bg-tint",
  },
};

export function statusLabel(status: EligibilityStatus): string {
  return STATUS_META[status].label;
}

// A UI response, not marketing: each item within the 300ms budget, and the whole
// cascade done in about half a second after the answer lands.
const stack: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04 } },
};

const rise: Variants = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  shown: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.3, ease: EASE_OUT } },
};

// The badge on a positive verdict settles with a slight spring: the one word the
// student waited for. Bad news keeps the plain cascade; emphasis there would sting.
const settle: Variants = {
  hidden: { opacity: 0, transform: "translateY(8px) scale(0.96)" },
  shown: {
    opacity: 1,
    transform: "translateY(0px) scale(1)",
    transition: {
      transform: { type: "spring", duration: 0.4, bounce: 0.15 },
      opacity: { duration: 0.3, ease: EASE_OUT },
    },
  },
};

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
    <h3 id={id} className="type-eyebrow text-ink-secondary">
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
    return (
      <p className="rounded-xl bg-tint p-4 text-sm text-ink-secondary">
        No rule was quoted. This result rests on missing information.
      </p>
    );
  }
  return (
    <figure aria-labelledby="verdict-rule" className="flex flex-col gap-3 rounded-xl border-l-2 border-rust bg-tint py-4 pr-4 pl-5">
      <SectionHeading id="verdict-rule">The rule</SectionHeading>
      <blockquote className="font-display text-lg leading-snug text-ink wrap-anywhere sm:text-xl">
        &ldquo;
        {/* The marker sweep: a gradient whose width grows behind the text. */}
        <motion.span
          className="box-decoration-clone bg-linear-to-r from-rust-tint to-rust-tint bg-no-repeat"
          initial={{ backgroundSize: "0% 100%" }}
          animate={{ backgroundSize: "100% 100%" }}
          transition={{ duration: 0.8, ease: EASE_IN_OUT, delay: 0.5 }}
        >
          {clause}
        </motion.span>
        &rdquo;
      </blockquote>
      {source && <figcaption className="text-sm text-ink-secondary wrap-anywhere">{source.document}</figcaption>}
    </figure>
  );
}

interface VerdictSourceProps {
  source: Source | null;
  // The heading always names the program, and a quoted rule's caption names the
  // document, so the document is repeated here only when there is no rule.
  showDocument: boolean;
}

function VerdictSource({ source, showDocument }: VerdictSourceProps) {
  if (!source) {
    return <p className="text-sm text-ink-secondary">No source document was cited for this result.</p>;
  }
  const httpUrl = safeHttpUrl(source.url);
  return (
    <section aria-labelledby="verdict-source" className="flex flex-col gap-2 text-sm wrap-anywhere">
      <SectionHeading id="verdict-source">Source</SectionHeading>
      {showDocument && <p className="text-ink-secondary">{source.document}</p>}
      {httpUrl ? (
        // The raw string, not httpUrl.href: the check above already proved it is
        // http(s), and href normalization would change what the backend sent.
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex w-fit items-center gap-1 rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors duration-150 hover:decoration-ink"
        >
          Open source on {httpUrl.hostname}
          <span className="sr-only"> (opens in a new tab)</span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      ) : (
        <p className="text-ink-secondary">{source.url}</p>
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
      <ol aria-labelledby="verdict-trace" className="flex flex-col gap-1.5 text-sm text-ink-secondary">
        {steps.map((step) => (
          <li key={step} className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-sage-text" />
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
    <motion.div
      initial="hidden"
      animate="shown"
      variants={stack}
      className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card"
    >
      <div className={`flex flex-col items-start gap-3 border-b border-hairline px-6 py-6 sm:px-8 ${meta.headerClassName}`}>
        <motion.div
          variants={result.status === "not_eligible" ? rise : settle}
          className={`motion-reduce:transform-none! inline-flex origin-left items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${meta.badgeClassName}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {meta.label}
        </motion.div>
        <motion.h2 variants={rise} className="motion-reduce:transform-none! font-display text-title leading-tight text-ink wrap-anywhere sm:text-title-lg">
          {result.source ? result.source.program : "Your result"}
        </motion.h2>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
        <motion.p variants={rise} className="motion-reduce:transform-none! text-lg leading-relaxed text-ink">
          {result.explanation}
        </motion.p>

        <motion.div variants={rise} className="motion-reduce:transform-none!">
          <VerdictRule clause={result.supporting_clause} source={result.source} />
        </motion.div>

        {result.missing_info.length > 0 && (
          <motion.div variants={rise} className="motion-reduce:transform-none! flex gap-3 rounded-xl border border-dashed border-rust/50 p-4">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
            <div>
              <p className="text-sm font-semibold text-ink">This result may change with more information:</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-ink-secondary marker:text-rust">
                {result.missing_info.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        <motion.div variants={rise} className="motion-reduce:transform-none! grid gap-6 sm:grid-cols-2">
          <VerdictSource source={result.source} showDocument={!result.supporting_clause} />
          <VerdictTrace steps={result.tool_trace} />
        </motion.div>
      </div>

      <motion.p variants={rise} className="motion-reduce:transform-none! border-t border-hairline bg-tint/60 px-6 py-4 text-caption text-ink-secondary sm:px-8">
        ScholarLens checks eligibility rules, not your chances of an award. Confirm details with the
        program before applying.
      </motion.p>
    </motion.div>
  );
}
