import { CheckCircle2, CircleDot, Info } from "lucide-react";
import type { ReactNode } from "react";

// The clause is quoted word for word from backend/data/programs/georgia_hope_scholarship.md,
// so the example never shows a rule ScholarLens could not actually quote. A different
// program from the landing page's Pell example, so the two pages don't repeat each other.
const EXAMPLE = {
  question:
    "I'm finishing high school in Atlanta with a 3.4 GPA. I'm a U.S. citizen and I've lived in Georgia all my life. Can I get the HOPE Scholarship?",
  program: "Georgia HOPE Scholarship",
  summary:
    "Your GPA, Georgia residency, and citizenship match HOPE's rules, but the scholarship also requires four full-rigor credits from the state's course list, and you didn't say how many you have.",
  clause: "Must earn a minimum of four full-rigor credits from the Academic Rigor Course List.",
  document: "Eligibility summary",
  sourceHost: "gafutures.org",
  missing: "How many full-rigor credits from the Academic Rigor Course List you have earned",
  trace: ["Searching program rules", "Validating eligibility", "Preparing cited answer"],
};

const NOTES = [
  { term: "The verdict", body: "Eligible, partial match, or not eligible. It never estimates your odds of winning." },
  { term: "Why", body: "One plain-language paragraph that ties what you said to the program's rules." },
  { term: "The rule", body: "The exact clause the answer rests on, quoted word for word." },
  { term: "The source", body: "The document the rule came from, with a link to the program's official page." },
  { term: "What's missing", body: "Anything you didn't mention that could change the answer, instead of a guess." },
  { term: "How it was found", body: "The steps the agent actually took for your question." },
];

function Row({ note, children }: { note: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 sm:gap-4">
      {/* The same numbers as the key below, so each part can be looked up. */}
      <span aria-hidden="true" className="font-display text-body-lg leading-7 text-rust-text">
        {note}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AnnotatedResult() {
  return (
    <figure className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card">
        <p className="border-b border-hairline px-5 py-4 text-body-sm leading-relaxed text-ink sm:px-6">
          <span className="mb-1 block text-caption font-semibold text-ink-secondary">Example question</span>
          &ldquo;{EXAMPLE.question}&rdquo;
        </p>

        <div className="flex flex-col gap-2 border-b border-hairline bg-rust-tint/50 px-5 py-5 sm:px-6">
          <Row note={1}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rust-tint px-2.5 py-1 text-caption font-semibold text-rust-text">
              <CircleDot aria-hidden="true" className="size-4" />
              Partial match
            </span>
          </Row>
          <p className="pl-[calc(1.5rem+0.75rem)] font-display text-title-sm leading-tight text-ink sm:pl-[calc(1.5rem+1rem)]">
            {EXAMPLE.program}
          </p>
        </div>

        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6">
          <Row note={2}>
            <p className="text-body-sm leading-relaxed text-ink-secondary">{EXAMPLE.summary}</p>
          </Row>

          <Row note={3}>
            <blockquote className="rounded-xl border-l-2 border-rust bg-tint py-3 pr-4 pl-4 font-display text-body-lg leading-snug text-ink">
              &ldquo;<span className="box-decoration-clone bg-rust/20">{EXAMPLE.clause}</span>&rdquo;
            </blockquote>
          </Row>

          <Row note={4}>
            <p className="text-body-sm text-ink-secondary">
              {EXAMPLE.document}, linked to the official page on{" "}
              <span className="font-semibold text-ink">{EXAMPLE.sourceHost}</span>
            </p>
          </Row>

          <Row note={5}>
            <div className="flex gap-2.5 rounded-xl border border-dashed border-rust/50 p-3">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rust-text" />
              <p className="text-caption text-ink-secondary">
                This result may change with more information:{" "}
                <span className="font-semibold text-ink">{EXAMPLE.missing}</span>
              </p>
            </div>
          </Row>

          <Row note={6}>
            <ol className="flex flex-col gap-1.5 text-caption text-ink-secondary">
              {EXAMPLE.trace.map((step) => (
                <li key={step} className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-sage-text" />
                  {step}
                </li>
              ))}
            </ol>
          </Row>
        </div>
      </div>

      <figcaption>
        <ol className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {NOTES.map((note, index) => (
            <li key={note.term} className="flex gap-3">
              <span aria-hidden="true" className="w-6 shrink-0 font-display text-body-lg leading-6 text-rust-text">
                {index + 1}
              </span>
              <p className="text-body-sm leading-relaxed">
                <span className="block font-semibold text-ink">{note.term}</span>
                {note.body}
              </p>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
