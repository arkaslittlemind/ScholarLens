"use client";

import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { EASE_OUT } from "@/components/motion/Reveal";

// An illustrative result built from the real Pell Grant corpus document, so
// the preview never shows a rule ScholarLens could not actually quote.
const CLAUSE =
  "Must be enrolled in an eligible undergraduate program and not already hold a Bachelor's or professional degree.";

const PROFILE = ["New Jersey", "GPA 3.6", "$40,000 income", "First-year"];

const TRACE = ["Searching program rules", "Validating eligibility", "Preparing cited answer"];

const stack: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.55 } },
};

const rise: Variants = {
  hidden: { opacity: 0, transform: "translateY(10px)" },
  shown: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.5, ease: EASE_OUT } },
};

function Annotation({ children, className }: { children: string; className: string }) {
  return (
    <motion.p
      variants={rise}
      // Sits outside the card, so only at widths with room in the margin.
      className={`motion-reduce:transform-none! absolute hidden font-display text-[17px] whitespace-pre-line text-rust-text italic xl:block ${className}`}
    >
      {children}
    </motion.p>
  );
}

export function HeroPreview() {
  return (
    <motion.div
      role="img"
      aria-label="Example result: Federal Pell Grant, eligible, quoting the enrollment rule from the official eligibility summary."
      initial="hidden"
      animate="shown"
      variants={stack}
      className="relative mx-auto w-full max-w-240"
    >
      <Annotation className="top-[38%] -left-2 -translate-x-full text-right">
        {"the exact rule,\nquoted"}
      </Annotation>
      <Annotation className="top-[70%] -right-2 translate-x-full">linked to the source</Annotation>

      <motion.div
        variants={{
          hidden: { opacity: 0, transform: "translateY(24px) scale(0.98)" },
          shown: {
            opacity: 1,
            transform: "translateY(0px) scale(1)",
            transition: { duration: 0.8, ease: EASE_OUT, delay: 0.2 },
          },
        }}
        className="motion-reduce:transform-none! grid overflow-hidden rounded-2xl border border-hairline bg-paper text-left shadow-lift md:grid-cols-[0.85fr_1.15fr]"
      >
        <div className="hidden flex-col gap-4 border-r border-hairline bg-tint/60 p-6 md:flex">
          <p className="type-eyebrow text-ink-secondary">Your situation</p>
          <p className="rounded-lg border border-hairline bg-paper p-4 text-[15px] leading-relaxed text-ink">
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
              <span key={step} className="flex items-center gap-2 text-[13px] text-ink-secondary">
                <CheckCircle2 aria-hidden="true" className="size-3.5 text-sage-text" />
                {step}
              </span>
            ))}
          </div>
        </div>

        <motion.div variants={stack} className="flex flex-col gap-5 p-6 sm:p-8">
          <motion.div variants={rise} className="motion-reduce:transform-none! flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-tint px-2.5 py-1 text-[13px] font-semibold text-sage-text">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              Eligible
            </span>
            <span className="text-xs font-medium text-ink-secondary">Example result</span>
          </motion.div>

          <motion.p variants={rise} className="motion-reduce:transform-none! font-display text-[28px] leading-tight text-ink sm:text-[32px]">
            Federal Pell Grant
          </motion.p>

          <motion.p variants={rise} className="motion-reduce:transform-none! text-[15px] leading-relaxed text-ink-secondary">
            You&apos;re a first-time undergraduate without a prior degree, which meets the program&apos;s
            enrollment rule.
          </motion.p>

          <motion.div variants={rise} className="motion-reduce:transform-none! border-l-2 border-rust pl-4">
            <p className="text-[13px] font-semibold text-ink">The rule</p>
            <p className="mt-1.5 font-display text-[17px] leading-snug text-ink">
              &ldquo;
              {/* The marker sweep: a gradient whose width grows behind the text. */}
              <motion.span
                className="box-decoration-clone bg-linear-to-r from-rust-tint to-rust-tint bg-no-repeat"
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 1.25 }}
              >
                {CLAUSE}
              </motion.span>
              &rdquo;
            </p>
            <p className="mt-2 text-[13px] text-ink-secondary">Eligibility summary</p>
          </motion.div>

          <motion.span
            variants={rise}
            className="motion-reduce:transform-none! inline-flex w-fit items-center gap-1 text-sm font-semibold text-ink underline decoration-hairline underline-offset-4"
          >
            Open source on studentaid.gov
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
