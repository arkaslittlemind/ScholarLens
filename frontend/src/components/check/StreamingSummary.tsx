"use client";

import { m, useReducedMotion, type Variants } from "motion/react";
import { EASE_OUT } from "@/components/motion/easing";
import { safeHttpUrl, type Source } from "@/lib/eligibility";

// The finished answer resolves word by word, after beautifului.dev's Streaming
// Text. Every word is in the DOM from the first frame and only its opacity and
// blur animate, so the line never reflows and screen readers read one sentence.

const WORD_SECONDS = 0.25;
const MAX_STEP_SECONDS = 0.055;
// The answer already took seconds to arrive, so a long summary speeds up to
// keep the whole reveal under about a second.
const MAX_STAGGER_SECONDS = 0.8;

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function stepSeconds(wordCount: number): number {
  return wordCount === 0 ? 0 : Math.min(MAX_STEP_SECONDS, MAX_STAGGER_SECONDS / wordCount);
}

// When the last word starts to appear, which is when the rest of the card can follow.
export function summaryRevealDelay(text: string): number {
  const count = splitWords(text).length;
  return stepSeconds(count) * Math.max(count - 1, 0);
}

const wordReveal: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  shown: { opacity: 1, filter: "blur(0px)", transition: { duration: WORD_SECONDS, ease: EASE_OUT } },
};

const chip: Variants = {
  hidden: { opacity: 0, transform: "scale(0.96)" },
  shown: { opacity: 1, transform: "scale(1)", transition: { duration: WORD_SECONDS, ease: EASE_OUT } },
};

interface SourceChipProps {
  source: Source | null;
  animated: boolean;
}

function SourceChip({ source, animated }: SourceChipProps) {
  const httpUrl = source ? safeHttpUrl(source.url) : null;
  if (!source || !httpUrl) return null;
  return (
    <m.a
      variants={animated ? chip : undefined}
      // The raw string, not httpUrl.href: the check above already proved it is
      // http(s), and href normalization would change what the backend sent.
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-0.5 inline-flex -translate-y-px items-center rounded-full border border-hairline bg-tint px-2 py-0.5 align-middle text-caption font-semibold text-ink-secondary transition-colors duration-150 hover:border-input hover:text-ink"
    >
      <span className="sr-only">Source: </span>
      {httpUrl.hostname}
      <span className="sr-only"> (opens in a new tab)</span>
    </m.a>
  );
}

interface StreamingSummaryProps {
  text: string;
  source: Source | null;
}

export function StreamingSummary({ text, source }: StreamingSummaryProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const words = splitWords(text);
  const container: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: stepSeconds(words.length) } },
  };

  return (
    // Takes "hidden"/"shown" from the verdict card, so it starts in the card's cascade.
    <m.p variants={reduceMotion ? undefined : container} className="text-lg leading-relaxed text-ink">
      {words.map((word, index) => (
        // Words can repeat, so the position is part of the key.
        <m.span key={`${index}-${word}`} variants={reduceMotion ? undefined : wordReveal}>
          {word}{" "}
        </m.span>
      ))}
      <SourceChip source={source} animated={!reduceMotion} />
    </m.p>
  );
}
