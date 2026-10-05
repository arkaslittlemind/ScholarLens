import { COVERED_PROGRAMS } from "@/lib/programs";

function ProgramChip({ name, scope }: { name: string; scope: string }) {
  return (
    <li className="flex shrink-0 items-center gap-3 rounded-xl border border-hairline bg-paper px-4 py-3 shadow-card">
      <span className="font-display text-[17px] whitespace-nowrap text-ink">{name}</span>
      <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-ink-secondary">
        {scope}
      </span>
    </li>
  );
}

export function ProgramRail() {
  return (
    <div className="group relative overflow-hidden mask-x-from-90% mask-x-to-100% motion-reduce:mask-none">
      {/* Reduced motion gets the same list, wrapped and still. */}
      <div className="flex w-max py-2 group-hover:[animation-play-state:paused] motion-safe:animate-marquee motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
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
  );
}
