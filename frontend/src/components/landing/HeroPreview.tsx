"use client";

import { CheckCircle2, CircleDot, Globe, Info } from "lucide-react";
import { Tabs } from "radix-ui";
import { useState } from "react";

interface Example {
  id: string;
  tab: string;
  label: string;
  question: string;
  profile: string[];
  trace: string[];
  program: string;
  summary: string;
  fromWeb: boolean;
  missing: string;
  clause: string;
  clauseSource: string;
  sourceHost: string;
  // Each note sits in the right margin, level with the part of the result it names.
  annotations: { text: string; className: string }[];
}

// Each clause is quoted word for word from its official source, so the preview
// never shows a rule ScholarLens could not actually quote. The Pell clause comes
// from the corpus document; the scheme clause from education.gov.in/node/255.
// Both are partial matches on purpose: neither student gave the one number their
// program turns on, and a confident "eligible" here would contradict the page.
const EXAMPLES: Example[] = [
  {
    id: "us",
    tab: "A student in the US",
    label:
      "Example result: Federal Pell Grant, partial match, quoting the Student Aid Index rule from the official eligibility summary and waiting on the student's SAI.",
    question:
      "I'm a U.S. citizen starting my first year as an undergraduate, and I don't have a degree yet. I filed the FAFSA. Am I eligible for the Pell Grant?",
    profile: ["U.S. citizen", "First-year undergraduate", "No prior degree", "Filed the FAFSA"],
    trace: ["Searching program rules", "Validating eligibility", "Preparing cited answer"],
    program: "Federal Pell Grant",
    summary:
      "You meet the citizenship and enrollment rules, but Pell is decided by your Student Aid Index, which you didn't mention.",
    fromWeb: false,
    missing: "Your Student Aid Index (SAI), shown on your FAFSA results",
    clause:
      "Must file the FAFSA; eligibility is determined by the Student Aid Index (SAI), not a single flat income cutoff.",
    clauseSource: "Eligibility summary",
    sourceHost: "studentaid.gov",
    annotations: [
      { text: "the exact rule,\nquoted", className: "top-[48%]" },
      { text: "linked to the\nsource", className: "top-[86%]" },
    ],
  },
  {
    id: "india",
    tab: "A student in India",
    label:
      "Example result: India's Central Sector Scheme of Scholarship, partial match found on the web, quoting the Class XII percentile rule and waiting on the student's percentile.",
    question:
      "I finished Class XII in Uttar Pradesh with 91% and started a B.Sc. at a government college. My family earns about ₹3 lakh a year. Is there a central government scholarship I can get?",
    profile: ["Uttar Pradesh", "Class XII: 91%", "₹3 lakh income", "First-year B.Sc."],
    trace: [
      "Searching program rules",
      "Checking official sources",
      "Validating eligibility",
      "Preparing cited answer",
    ],
    program: "Central Sector Scheme of Scholarship",
    summary:
      "Your family income is under the scheme's ₹4.5 lakh limit and you're in a regular degree course, but the scheme also depends on where your marks fall among your board's results.",
    fromWeb: true,
    missing: "Your Class XII percentile within your board and stream",
    clause:
      "above 80th percentile of successful candidates in the relevant stream from a particular Board of Examination in class XII",
    clauseSource: "Ministry of Education, India",
    sourceHost: "education.gov.in",
    annotations: [
      { text: "labeled as a\nweb answer", className: "top-[10%]" },
      { text: "what it still\nneeds to know", className: "top-[77%]" },
    ],
  },
];

// The first panel plays the page's staged entrance once the card lands. A panel the
// visitor switches to is answering a click, so it arrives quickly instead.
const DELAYS = {
  initial: {
    annotation: ["[animation-delay:1000ms]", "[animation-delay:1080ms]"],
    badge: "[animation-delay:550ms]",
    program: "[animation-delay:630ms]",
    summary: "[animation-delay:710ms]",
    rule: "[animation-delay:790ms]",
    link: "[animation-delay:870ms]",
    sweep: "[animation-delay:1250ms]",
  },
  switched: {
    annotation: ["[animation-delay:300ms]", "[animation-delay:360ms]"],
    badge: "[animation-delay:0ms]",
    program: "[animation-delay:40ms]",
    summary: "[animation-delay:80ms]",
    rule: "[animation-delay:120ms]",
    link: "[animation-delay:160ms]",
    sweep: "[animation-delay:350ms]",
  },
};

function Annotation({ children, className }: { children: string; className: string }) {
  return (
    <p
      // Sits outside the card, so only at widths with room in the margin. Hidden from
      // assistive tech: the preview's label already says what each note points at.
      aria-hidden="true"
      className={`absolute -right-3 hidden translate-x-full animate-rise-in font-display text-body-lg whitespace-pre-line text-rust-text italic xl:block ${className}`}
    >
      {children}
    </p>
  );
}

function ExampleResult({ example, switched }: { example: Example; switched: boolean }) {
  const delay = switched ? DELAYS.switched : DELAYS.initial;

  return (
    <div role="img" aria-label={example.label} className="grid md:grid-cols-[0.85fr_1.15fr]">
      <div className="hidden flex-col gap-4 border-r border-hairline bg-tint/60 p-6 md:flex">
        <p className="type-eyebrow text-ink-secondary">Your situation</p>
        <p className="rounded-lg border border-hairline bg-paper p-4 text-body-sm leading-relaxed text-ink">
          {example.question}
        </p>
        <div className="flex flex-wrap gap-2">
          {example.profile.map((item) => (
            <span
              key={item}
              className="rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-medium text-ink-secondary"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-4">
          {example.trace.map((step) => (
            <span key={step} className="flex items-center gap-2 text-caption text-ink-secondary">
              <CheckCircle2 aria-hidden="true" className="size-3.5 text-sage-text" />
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6 sm:p-8">
        {/* Below md the situation column is hidden, so the verdict keeps its question. */}
        <div className="flex flex-col gap-1.5 border-b border-hairline pb-5 md:hidden">
          <p className="type-eyebrow text-ink-secondary">Your situation</p>
          <p className="text-body-sm leading-relaxed text-ink">&ldquo;{example.question}&rdquo;</p>
        </div>
        <div className={`flex animate-rise-in flex-col gap-3 ${delay.badge}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rust-tint px-2.5 py-1 text-caption font-semibold text-rust-text">
              <CircleDot aria-hidden="true" className="size-3.5" />
              Partial match
            </span>
            <span className="text-xs font-medium text-ink-secondary">Example result</span>
          </div>
          {example.fromWeb && (
            // Same words the real result uses for a web-sourced answer.
            <p className="flex items-start gap-1.5 text-caption text-ink-secondary">
              <Globe aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Found on the web. This isn&apos;t one of the programs we&apos;ve reviewed.
            </p>
          )}
        </div>

        <p className={`animate-rise-in font-display text-title leading-tight text-ink sm:text-title-lg ${delay.program}`}>
          {example.program}
        </p>

        <p className={`animate-rise-in text-body-sm leading-relaxed text-ink-secondary ${delay.summary}`}>
          {example.summary}
        </p>

        <div className={`animate-rise-in border-l-2 border-rust pl-4 ${delay.rule}`}>
          <p className="text-caption font-semibold text-ink">The rule</p>
          <p className="mt-1.5 font-display text-body-lg leading-snug text-ink">
            &ldquo;
            {example.fromWeb && "…"}
            {/* The marker sweep: a gradient whose width grows behind the text. */}
            <span className={`animate-marker-sweep box-decoration-clone bg-linear-to-r from-rust-tint to-rust-tint bg-no-repeat ${delay.sweep}`}>
              {example.clause}
            </span>
            {example.fromWeb && "…"}
            &rdquo;
          </p>
          <p className="mt-2 text-caption text-ink-secondary">{example.clauseSource}</p>
        </div>

        {/* The same sentence the real result uses for missing details. */}
        <div className={`flex animate-rise-in gap-2.5 rounded-lg border border-dashed border-rust/50 p-3 ${delay.rule}`}>
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
          <p className="text-caption text-ink-secondary">
            This result may change with more information:{" "}
            <span className="font-semibold text-ink">{example.missing}</span>
          </p>
        </div>

        {/* Plain text, not a link: the preview is one image to assistive tech, and a
            link-styled span that does nothing on tap reads as broken. */}
        <p className={`animate-rise-in text-caption text-ink-secondary ${delay.link}`}>
          Linked to the official page on <span className="font-semibold text-ink">{example.sourceHost}</span>
        </p>
      </div>
    </div>
  );
}

// The entrance is CSS, not Motion: it is in the server HTML, so the preview never
// waits on hydration. Delays stagger the content 80ms apart once the card lands.
export function HeroPreview() {
  const [active, setActive] = useState(EXAMPLES[0].id);
  const [switched, setSwitched] = useState(false);
  const example = EXAMPLES.find((item) => item.id === active) ?? EXAMPLES[0];
  const delay = switched ? DELAYS.switched : DELAYS.initial;

  return (
    <Tabs.Root
      value={active}
      onValueChange={(value) => {
        setActive(value);
        setSwitched(true);
      }}
      className="relative mx-auto flex w-full max-w-240 flex-col items-center gap-4"
    >
      <Tabs.List
        aria-label="Example results"
        className="flex animate-rise-in gap-1 rounded-full border border-hairline bg-paper p-1 shadow-card [animation-delay:200ms]"
      >
        {EXAMPLES.map((item) => (
          <Tabs.Trigger
            key={item.id}
            value={item.id}
            className="h-9 rounded-full px-4 text-caption font-semibold text-ink-secondary transition-colors duration-150 hover:text-ink data-[state=active]:bg-brown data-[state=active]:text-paper pointer-coarse:h-11"
          >
            {item.tab}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="relative w-full">
        {example.annotations.map((annotation, index) => (
          <Annotation key={`${example.id}-${annotation.text}`} className={`${annotation.className} ${delay.annotation[index]}`}>
            {annotation.text}
          </Annotation>
        ))}

        <div className="animate-preview-in overflow-hidden rounded-2xl border border-hairline bg-paper text-left shadow-lift [animation-delay:200ms]">
          {EXAMPLES.map((item) => (
            <Tabs.Content key={item.id} value={item.id} className="rounded-2xl">
              <ExampleResult example={item} switched={switched} />
            </Tabs.Content>
          ))}
        </div>
      </div>
    </Tabs.Root>
  );
}
