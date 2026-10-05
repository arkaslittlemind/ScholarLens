"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";

// Created once per component lifetime (not module scope) so state never leaks
// across server-rendered requests; see the official Next.js App Router setup.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* "user" only covers the x/y/scale shorthands. Our animations use full transform
          strings to stay on the compositor, so each moving element also carries
          motion-reduce:transform-none!, which overrides Motion's inline transform in CSS.
          useReducedMotion() would read matchMedia during hydration and mismatch the server HTML. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
