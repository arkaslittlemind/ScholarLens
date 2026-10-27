"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Only /check talks to the API, so React Query ships with that route instead of every page.
// Created once per component lifetime (not module scope) so state never leaks across
// server-rendered requests; see the official Next.js App Router setup.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
