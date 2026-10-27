"use client";

import { ArrowUpRight, BookCheck, CheckCircle2, CircleDot, Globe, Info, PencilLine, XCircle } from "lucide-react";
import { m, useReducedMotion, type Variants } from "motion/react";
import { StreamingSummary, summaryRevealDelay } from "@/components/check/StreamingSummary";
import { EASE_IN_OUT, EASE_OUT } from "@/components/motion/easing";
import { Button } from "@/components/ui/button";
import {
  displayLabel,
  safeHttpUrl,
  type Alternative,
  type EligibilityResult,
  type EligibilityStatus,
  type Source,
  type SourceOrigin,
} from "@/lib/eligibility";

// Renders arbitrary model/web-search output (summary, reasons, next steps,
// alternatives, supporting_clause) as plain React text children only - never
// dangerouslySetInnerHTML.

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

// Where the cited rule came from, decided on the server by which tool returned its URL.
// A web answer is not wrong, but nobody here has reviewed it, and the student should know.
const ORIGIN_META: Record<SourceOrigin, { icon: typeof Globe; text: string }> = {
  knowledge_base: { icon: BookCheck, text: "From the program rules we've reviewed." },
  web: {
    icon: Globe,
    text: "Found on the web. This isn't one of the programs we've reviewed.",
  },
};

// A partial match that quotes no rule isn't a weak yes: it is waiting on the student.
// Same rust voice as any partial match, plainer words.
function awaitsDetails(result: EligibilityResult): boolean {
  return result.status === "partial" && !result.supporting_clause && result.missing_info.length > 0;
}

export function verdictLabel(result: EligibilityResult): string {
  return awaitsDetails(result) ? "Depends on your details" : STATUS_META[result.status].label;
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

interface SourceLinkProps {
  url: string;
  label: string;
}

// A link only when the URL is http(s); anything else stays inert text.
function SourceLink({ url, label }: SourceLinkProps) {
  const httpUrl = safeHttpUrl(url);
  if (!httpUrl) return <p className="text-ink-secondary">{url}</p>;
  return (
    <a
      // The raw string, not httpUrl.href: the check above already proved it is
      // http(s), and href normalization would change what the backend sent.
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex w-fit items-center gap-1 rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors duration-150 hover:decoration-ink pointer-coarse:min-h-11"
    >
      {label} {httpUrl.hostname}
      <span className="sr-only"> (opens in a new tab)</span>
      <ArrowUpRight
        aria-hidden="true"
        className="size-4 transition-transform duration-150 motion-safe:pointer-fine:group-hover:translate-x-0.5 motion-safe:pointer-fine:group-hover:-translate-y-0.5"
      />
    </a>
  );
}

// The model can repeat an entry, so the text alone is not a unique key.
function itemKey(index: number, text: string): string {
  return `${index}-${text}`;
}

interface VerdictListProps {
  id: string;
  heading: string;
  items: string[];
  ordered?: boolean;
}

function VerdictList({ id, heading, items, ordered = false }: VerdictListProps) {
  const List = ordered ? "ol" : "ul";
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <SectionHeading id={id}>{heading}</SectionHeading>
      <List
        className={`flex flex-col gap-1.5 pl-5 leading-relaxed text-ink marker:text-ink-secondary ${ordered ? "list-decimal" : "list-disc"}`}
      >
        {items.map((item, index) => (
          <li key={itemKey(index, item)} className="wrap-anywhere">
            {item}
          </li>
        ))}
      </List>
    </section>
  );
}

interface VerdictAlternativesProps {
  alternatives: Alternative[];
}

function VerdictAlternatives({ alternatives }: VerdictAlternativesProps) {
  return (
    <section aria-labelledby="verdict-alternatives" className="flex flex-col gap-3">
      <SectionHeading id="verdict-alternatives">Other programs to look at</SectionHeading>
      <ul className="flex flex-col gap-3">
        {alternatives.map((alternative, index) => (
          <li
            key={itemKey(index, alternative.program)}
            className="flex flex-col gap-1.5 rounded-xl border border-hairline p-4 text-sm wrap-anywhere"
          >
            <p className="font-semibold text-ink">{alternative.program}</p>
            <p className="text-ink-secondary">{alternative.why_it_may_fit}</p>
            <SourceLink url={alternative.source_url} label="Official page on" />
          </li>
        ))}
      </ul>
    </section>
  );
}

// The marker sweep starts once the rule has risen in.
const RULE_SWEEP_DELAY_SECONDS = 0.5;

interface VerdictRuleProps {
  clause: string | null;
  source: Source | null;
  sweepDelay: number;
  awaitingDetails: boolean;
  fromWeb: boolean;
}

function VerdictRule({ clause, source, sweepDelay, awaitingDetails, fromWeb }: VerdictRuleProps) {
  // A web quote keeps the panel (it is still the rule the answer rests on) but says where it
  // was published and that nobody here reviewed it, right where the student reads it.
  const webHost = fromWeb && source ? safeHttpUrl(source.url)?.hostname : undefined;
  if (!clause) {
    return (
      <p className="rounded-xl bg-tint p-4 text-sm text-ink-secondary">
        {awaitingDetails
          ? "There's no rule to quote yet, because the answer depends on details you haven't shared."
          : "No rule could be quoted for this result."}
      </p>
    );
  }
  return (
    <figure aria-labelledby="verdict-rule" className="flex flex-col gap-3 rounded-xl border-l-2 border-rust bg-tint py-4 pr-4 pl-5">
      <SectionHeading id="verdict-rule">{webHost ? `The rule, as published on ${webHost}` : "The rule"}</SectionHeading>
      <blockquote className="font-display text-lg leading-snug text-ink wrap-anywhere sm:text-xl">
        &ldquo;
        {/* The marker sweep: a gradient whose width grows behind the text. Rust Wash alone
            barely differs from the tint panel, so the stroke is rust itself at low strength. */}
        <m.span
          className="box-decoration-clone bg-linear-to-r from-rust/20 to-rust/20 bg-no-repeat"
          initial={{ backgroundSize: "0% 100%" }}
          animate={{ backgroundSize: "100% 100%" }}
          transition={{ duration: 0.8, ease: EASE_IN_OUT, delay: sweepDelay }}
        >
          {clause}
        </m.span>
        &rdquo;
      </blockquote>
      {source && (
        <figcaption className="text-sm text-ink-secondary wrap-anywhere">
          {source.document}
          {webHost && (
            <span className="mt-1 flex items-start gap-1.5">
              <Globe aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Not reviewed by ScholarLens. Check the wording on the official page before you rely on it.
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

interface VerdictSourceProps {
  source: Source | null;
  // The heading always names the program, and a quoted rule's caption names the
  // document, so the document is repeated here only when there is no rule.
  showDocument: boolean;
  // The missing-details box already says why nothing is cited, so silence is clearer here.
  awaitingDetails: boolean;
}

function VerdictSource({ source, showDocument, awaitingDetails }: VerdictSourceProps) {
  if (!source) {
    if (awaitingDetails) return null;
    return <p className="text-sm text-ink-secondary">No source document was cited for this result.</p>;
  }
  return (
    <section aria-labelledby="verdict-source" className="flex flex-col gap-2 text-sm wrap-anywhere">
      <SectionHeading id="verdict-source">Source</SectionHeading>
      {showDocument && <p className="text-ink-secondary">{source.document}</p>}
      <SourceLink url={source.url} label="Open source on" />
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
  // Takes the student back to the description, so missing details lead somewhere.
  onAddDetails?: () => void;
}

export function VerdictCard({ result, onAddDetails }: VerdictCardProps) {
  const meta = STATUS_META[result.status];
  const Icon = meta.icon;
  const origin = result.source && result.source_origin ? ORIGIN_META[result.source_origin] : undefined;
  const OriginIcon = origin?.icon;
  const reduceMotion = useReducedMotion() ?? false;
  // Everything after the summary waits for its last word, so the card reads top to bottom.
  const followDelay = reduceMotion ? 0 : summaryRevealDelay(result.summary);
  const followSummary: Variants = {
    hidden: {},
    shown: { transition: { delayChildren: followDelay, staggerChildren: 0.04 } },
  };

  return (
    <m.div
      initial="hidden"
      animate="shown"
      // Leaving on a new check: a quick fade instead of the tall card vanishing in one frame.
      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
      variants={stack}
      className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card"
    >
      <div className={`flex flex-col items-start gap-3 border-b border-hairline px-6 py-6 sm:px-8 ${meta.headerClassName}`}>
        <m.div
          variants={result.status === "not_eligible" ? rise : settle}
          className={`motion-reduce:transform-none! inline-flex origin-left items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${meta.badgeClassName}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {verdictLabel(result)}
        </m.div>
        <m.h2 variants={rise} className="motion-reduce:transform-none! font-display text-title leading-tight text-ink wrap-anywhere sm:text-title-lg">
          {result.source ? result.source.program : awaitsDetails(result) ? "We need a few more details" : "Your result"}
        </m.h2>
        {origin && OriginIcon && (
          <m.p variants={rise} className="motion-reduce:transform-none! flex items-start gap-2 text-body-sm text-ink-secondary">
            <OriginIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {origin.text}
          </m.p>
        )}
      </div>

      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <StreamingSummary text={result.summary} source={result.source} />
      </div>

      {/* One sequence for everything after the summary, so the footer still comes last. */}
      <m.div variants={followSummary}>
        <div className="flex flex-col gap-6 px-6 pt-6 pb-6 sm:px-8 sm:pb-8">
          <m.div variants={rise} className="motion-reduce:transform-none!">
            <VerdictRule
              clause={result.supporting_clause}
              source={result.source}
              sweepDelay={RULE_SWEEP_DELAY_SECONDS + followDelay}
              awaitingDetails={result.missing_info.length > 0}
              fromWeb={result.source_origin === "web"}
            />
          </m.div>

          {result.reasons.length > 0 && (
            <m.div variants={rise} className="motion-reduce:transform-none!">
              <VerdictList id="verdict-reasons" heading="Why" items={result.reasons} />
            </m.div>
          )}

          {result.missing_info.length > 0 && (
            <m.div variants={rise} className="motion-reduce:transform-none! flex gap-3 rounded-xl border border-dashed border-rust/50 p-4">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
              <div>
                <p className="text-sm font-semibold text-ink">This result may change with more information:</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-secondary marker:text-rust">
                  {result.missing_info.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {onAddDetails && (
                  <Button type="button" variant="outline" size="sm" onClick={onAddDetails} className="mt-4 h-auto min-h-8 py-1.5 text-left whitespace-normal pointer-coarse:min-h-11">
                    <PencilLine aria-hidden="true" />
                    Add these details and check again
                  </Button>
                )}
              </div>
            </m.div>
          )}

          {result.next_steps.length > 0 && (
            <m.div variants={rise} className="motion-reduce:transform-none!">
              <VerdictList id="verdict-next-steps" heading="Next steps" items={result.next_steps} ordered />
            </m.div>
          )}

          {result.alternatives.length > 0 && (
            <m.div variants={rise} className="motion-reduce:transform-none!">
              <VerdictAlternatives alternatives={result.alternatives} />
            </m.div>
          )}

          <m.div variants={rise} className="motion-reduce:transform-none! grid grid-cols-1 gap-6 sm:grid-cols-2">
            <VerdictSource
              source={result.source}
              showDocument={!result.supporting_clause}
              awaitingDetails={awaitsDetails(result)}
            />
            <VerdictTrace steps={result.tool_trace} />
          </m.div>
        </div>

        <m.p variants={rise} className="motion-reduce:transform-none! border-t border-hairline bg-tint/60 px-6 py-4 text-caption text-ink-secondary sm:px-8">
          ScholarLens checks eligibility rules, not your chances of an award. Confirm details with the
          program before applying.
        </m.p>
      </m.div>
    </m.div>
  );
}
