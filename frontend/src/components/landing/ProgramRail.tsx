"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { COVERED_PROGRAMS } from "@/lib/programs";

function ProgramChip({ name, scope }: { name: string; scope: string }) {
  return (
    <li className="flex shrink-0 items-center gap-3 rounded-xl border border-hairline bg-paper px-4 py-3 shadow-card">
      <span className="font-display text-body-lg whitespace-nowrap text-ink">{name}</span>
      <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-ink-secondary">
        {scope}
      </span>
    </li>
  );
}

export function ProgramRail() {
  // Content that moves on its own for more than five seconds needs a way to stop
  // it (WCAG 2.2.2). Hover pauses it for mouse users; this button is for everyone.
  const [paused, setPaused] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        data-paused={paused}
        className="group relative w-full overflow-hidden mask-x-from-90% mask-x-to-100% motion-reduce:mask-none"
      >
        {/* Reduced motion gets the same list, wrapped and still. */}
        <div className="flex w-max py-2 group-hover:paused group-data-[paused=true]:paused motion-safe:animate-marquee motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
          <ul aria-label="Programs covered" className="flex gap-4 pr-4 motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0">
            {COVERED_PROGRAMS.map((program) => (
              <ProgramChip key={program.name} {...program} />
            ))}
          </ul>
          <ul aria-hidden="true" className="flex gap-4 pr-4 motion-reduce:hidden">
            {COVERED_PROGRAMS.map((program) => (
              <ProgramChip key={program.name} {...program} />
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-caption font-semibold text-ink-secondary transition-press hover:bg-paper hover:text-ink active:scale-[0.97] pointer-coarse:h-11 motion-reduce:hidden"
      >
        {paused ? (
          <Play aria-hidden="true" className="size-3.5" />
        ) : (
          <Pause aria-hidden="true" className="size-3.5" />
        )}
        {paused ? "Resume scrolling" : "Pause scrolling"}
      </button>
    </div>
  );
}
