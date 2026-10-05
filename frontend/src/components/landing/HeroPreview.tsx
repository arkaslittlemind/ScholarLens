import { ArrowUpRight, CheckCircle2 } from "lucide-react";

// An illustrative result built from the real Pell Grant corpus document, so
// the preview never shows a rule ScholarLens could not actually quote.
const CLAUSE =
  "Must be enrolled in an eligible undergraduate program and not already hold a Bachelor's or professional degree.";

const PROFILE = ["New Jersey", "GPA 3.6", "$40,000 income", "First-year"];

const TRACE = ["Searching program rules", "Validating eligibility", "Preparing cited answer"];

function Annotation({ children, className }: { children: string; className: string }) {
  return (
    <p
      // Sits outside the card, so only at widths with room in the margin.
      className={`absolute hidden animate-rise-in font-display text-body-lg whitespace-pre-line text-rust-text italic xl:block ${className}`}
    >
      {children}
    </p>
  );
}

// The entrance is CSS, not Motion: it is in the server HTML, so the preview never
// waits on hydration. Delays stagger the content 80ms apart once the card lands.
export function HeroPreview() {
  return (
    <div
      role="img"
      aria-label="Example result: Federal Pell Grant, eligible, quoting the enrollment rule from the official eligibility summary."
      className="relative mx-auto w-full max-w-240"
    >
      <Annotation className="top-[38%] -left-2 -translate-x-full text-right [animation-delay:1000ms]">
        {"the exact rule,\nquoted"}
      </Annotation>
      <Annotation className="top-[70%] -right-2 translate-x-full [animation-delay:1080ms]">
        linked to the source
      </Annotation>

      <div className="grid animate-preview-in overflow-hidden rounded-2xl border border-hairline bg-paper text-left shadow-lift [animation-delay:200ms] md:grid-cols-[0.85fr_1.15fr]">
        <div className="hidden flex-col gap-4 border-r border-hairline bg-tint/60 p-6 md:flex">
          <p className="type-eyebrow text-ink-secondary">Your situation</p>
          <p className="rounded-lg border border-hairline bg-paper p-4 text-body-sm leading-relaxed text-ink">
            I&apos;m a U.S. citizen starting my first year as an undergraduate. I filed the FAFSA. Am
            I eligible for the Pell Grant?
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFILE.map((item) => (
              <span
                key={item}
                className="rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs font-medium text-ink-secondary"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            {TRACE.map((step) => (
              <span key={step} className="flex items-center gap-2 text-caption text-ink-secondary">
                <CheckCircle2 aria-hidden="true" className="size-3.5 text-sage-text" />
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex animate-rise-in items-center justify-between gap-3 [animation-delay:550ms]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-tint px-2.5 py-1 text-caption font-semibold text-sage-text">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              Eligible
            </span>
            <span className="text-xs font-medium text-ink-secondary">Example result</span>
          </div>

          <p className="animate-rise-in font-display text-title leading-tight text-ink [animation-delay:630ms] sm:text-title-lg">
            Federal Pell Grant
          </p>

          <p className="animate-rise-in text-body-sm leading-relaxed text-ink-secondary [animation-delay:710ms]">
            You&apos;re a first-time undergraduate without a prior degree, which meets the program&apos;s
            enrollment rule.
          </p>

          <div className="animate-rise-in border-l-2 border-rust pl-4 [animation-delay:790ms]">
            <p className="text-caption font-semibold text-ink">The rule</p>
            <p className="mt-1.5 font-display text-body-lg leading-snug text-ink">
              &ldquo;
              {/* The marker sweep: a gradient whose width grows behind the text. */}
              <span className="animate-marker-sweep box-decoration-clone bg-linear-to-r from-rust-tint to-rust-tint bg-no-repeat [animation-delay:1250ms]">
                {CLAUSE}
              </span>
              &rdquo;
            </p>
            <p className="mt-2 text-caption text-ink-secondary">Eligibility summary</p>
          </div>

          <span className="inline-flex w-fit animate-rise-in items-center gap-1 text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 [animation-delay:870ms]">
            Open source on studentaid.gov
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
