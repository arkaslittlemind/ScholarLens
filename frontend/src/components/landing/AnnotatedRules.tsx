"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { EASE_IN_OUT } from "@/components/motion/easing";
import { Reveal } from "@/components/motion/Reveal";

// Verbatim lines from backend/data/programs/federal_pell_grant.md, in corpus order,
// so the excerpt is the same document ScholarLens actually quotes from.
const RULES: { text: string; note?: number; quotedAbove?: boolean }[] = [
  {
    text: "Must file the FAFSA; eligibility is determined by the Student Aid Index (SAI), not a single flat income cutoff.",
    note: 1,
    // The hero's US example quotes this same line, so the two sections point at each other.
    quotedAbove: true,
  },
  { text: "SAI is calculated from family income, family size, number in college, and other FAFSA factors." },
  {
    text: "Starting with the 2026-27 award year, students with an SAI of $14,790 or higher are not eligible for any Pell Grant award, regardless of other factors.",
  },
  {
    text: "Must be enrolled in an eligible undergraduate program and not already hold a Bachelor's or professional degree.",
  },
  { text: "Must be a U.S. citizen or eligible non-citizen.", note: 2 },
  { text: "Must maintain satisfactory academic progress.", note: 3 },
];

const NOTES = [
  {
    title: "There's no simple income limit",
    body: "Pell uses a number from the federal aid application, while a state program may ask about family income instead. ScholarLens reads each program's own wording, so you don't have to compare them yourself.",
  },
  {
    title: "One line can decide everything",
    body: "A rule like this sits in the middle of a long list. ScholarLens checks every rule against what you told it and quotes the one it relied on, word for word, with a link to the source.",
  },
  {
    title: "Some rules need details you didn't give",
    body: "Instead of guessing, your result is marked a partial match and lists exactly what would change the answer.",
  },
];

function NoteNumber({ children }: { children: number }) {
  return <span className="font-display text-2xl leading-none text-rust-text">{children}</span>;
}

function NoteText({ index }: { index: number }) {
  const note = NOTES[index];
  return (
    <div className="flex gap-4">
      <NoteNumber>{index + 1}</NoteNumber>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-ink">{note.title}</h3>
        <p className="text-body-sm leading-relaxed text-ink-secondary">{note.body}</p>
      </div>
    </div>
  );
}

// The hero's highlighter pass, played when the excerpt scrolls into view. A sweep
// is not movement across the page, so it plays under reduced motion too.
function Highlight({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <m.mark
      className="box-decoration-clone bg-linear-to-r from-rust-tint to-rust-tint bg-no-repeat text-ink"
      initial={{ backgroundSize: "0% 100%" }}
      whileInView={{ backgroundSize: "100% 100%" }}
      viewport={{ once: true, margin: "0px 0px -120px 0px" }}
      transition={{ duration: 0.9, ease: EASE_IN_OUT, delay }}
    >
      {children}
    </m.mark>
  );
}

export function AnnotatedRules() {
  return (
    <section className="mx-auto flex max-w-280 flex-col gap-12 px-4 py-24 sm:px-6 md:py-32">
      <Reveal className="flex max-w-170 flex-col gap-5">
        <h2 className="font-display type-h2">
          Eligibility rules are written for program staff, and students have to work out what they mean.
        </h2>
        <p className="text-body-lg leading-relaxed text-ink-secondary">
          This is part of the Federal Pell Grant&apos;s own eligibility summary. The numbered notes
          show what makes rules like these hard to read, and what ScholarLens does about each one.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <Reveal className="rounded-2xl border border-hairline bg-paper p-6 shadow-card sm:p-8">
          <p className="text-caption text-ink-secondary">
            Federal Pell Grant, eligibility summary, studentaid.gov
          </p>
          <ul className="mt-5 flex list-disc flex-col gap-3 pl-5 text-body-sm leading-relaxed text-ink-secondary marker:text-input">
            {RULES.map((rule) => (
              <li key={rule.text}>
                {rule.note ? (
                  <>
                    <Highlight delay={0.2 + rule.note * 0.25}>{rule.text}</Highlight>
                    <sup className="ml-1 font-display text-sm font-semibold text-rust-text">{rule.note}</sup>
                    {rule.quotedAbove && (
                      <span className="mt-1 block font-display text-caption text-rust-text">
                        quoted in the US example above
                      </span>
                    )}
                    {/* Narrow screens read each note under its line instead of after the
                        whole excerpt, so nobody has to carry the numbers in their head. */}
                    <div className="mt-4 mb-2 -ml-5 lg:hidden">
                      <NoteText index={rule.note - 1} />
                    </div>
                  </>
                ) : (
                  rule.text
                )}
              </li>
            ))}
          </ul>
        </Reveal>

        <ol className="hidden flex-col gap-8 lg:flex">
          {NOTES.map((note, index) => (
            <li key={note.title}>
              <Reveal delay={0.1 + index * 0.08}>
                <NoteText index={index} />
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
