"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/components/motion/Reveal";

// A horizontal rule that draws left to right once in view, connecting a row of steps.
export function DrawLine({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`motion-reduce:transform-none! origin-left ${className ?? ""}`}
      initial={{ transform: "scaleX(0)" }}
      whileInView={{ transform: "scaleX(1)" }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
    />
  );
}
