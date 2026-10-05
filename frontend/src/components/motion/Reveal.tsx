"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

// Scroll-triggered entrance for marketing sections. Plays once: content a
// reader has already seen should not keep moving when they scroll back.
// The full transform string (not the `y` shorthand) keeps it on the compositor.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={`motion-reduce:transform-none! ${className ?? ""}`}
      initial={{ opacity: 0, transform: "translateY(16px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
