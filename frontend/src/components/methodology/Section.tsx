import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

interface SectionProps {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}

export function Section({ id, number, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hairline pt-10">
      <Reveal className="flex flex-col gap-5">
        <p className="font-display text-lg text-rust-text">{String(number).padStart(2, "0")}</p>
        <h2 className="font-display type-h2 text-ink">{title}</h2>
        {/* The column is wide enough for the examples and tables, so prose caps its own measure. */}
        <div className="flex flex-col gap-5 text-body-lg leading-relaxed text-ink-secondary [&>p]:max-w-prose">
          {children}
        </div>
      </Reveal>
    </section>
  );
}
