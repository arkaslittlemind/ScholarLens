"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // domAnimation covers everything the site animates (animate, variants, exit, in-view)
    // without drag or layout animation. strict makes a stray full `motion` component throw,
    // so nothing quietly pulls the whole library back into every page.
    <LazyMotion features={domAnimation} strict>
      {/* "user" only covers the x/y/scale shorthands. Our animations use full transform
          strings to stay on the compositor, so each moving element also carries
          motion-reduce:transform-none!, which overrides Motion's inline transform in CSS.
          useReducedMotion() would read matchMedia during hydration and mismatch the server HTML. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
