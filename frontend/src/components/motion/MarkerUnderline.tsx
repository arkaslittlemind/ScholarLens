"use client";

import { motion } from "motion/react";

interface MarkerUnderlineProps {
  className?: string;
  delay?: number;
}

// A hand-drawn marker stroke that draws itself once it scrolls into view.
export function MarkerUnderline({ className, delay = 0.35 }: MarkerUnderlineProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 24"
      fill="none"
      preserveAspectRatio="none"
      className={className}
    >
      <motion.path
        d="M4 16C68 7 150 4 226 6c58 2 112 6 170 3"
        stroke="var(--color-rust)"
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          pathLength: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
          opacity: { duration: 0.01, delay },
        }}
      />
    </svg>
  );
}
