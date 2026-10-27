import Link from "next/link";
import { COVERED_PROGRAMS, type CoveredProgram, programPath } from "@/lib/programs";

const FEDERAL = COVERED_PROGRAMS.filter((program) => program.scope === "Federal");
const STATE = COVERED_PROGRAMS.filter((program) => program.scope !== "Federal");

function ProgramGroup({ heading, programs, showScope }: { heading: string; programs: CoveredProgram[]; showScope: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-caption font-semibold text-ink-secondary">
        {heading} ({programs.length})
      </h3>
      <ul className="flex flex-wrap gap-2.5">
        {programs.map((program) => (
          <li key={program.slug}>
            <Link
              href={programPath(program.slug)}
              className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-hairline bg-paper px-3.5 py-2 transition-colors duration-150 hover:border-ink-secondary"
            >
              <span className="font-display text-body-lg text-ink">{program.name}</span>
              {showScope && (
                <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-ink-secondary">
                  {program.scope}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgramList() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr] md:gap-10">
      <ProgramGroup heading="Federal grants" programs={FEDERAL} showScope={false} />
      <ProgramGroup heading="State programs" programs={STATE} showScope />
    </div>
  );
}
