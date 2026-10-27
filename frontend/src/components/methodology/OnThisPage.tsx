"use client";

import { useEffect, useState } from "react";

export interface PageSection {
  id: string;
  label: string;
}

// Just under the sticky header: a section counts as current once its top passes this line.
const READING_LINE = 120;

export function OnThisPage({ sections }: { sections: PageSection[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let next: string | null = null;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= READING_LINE) next = section.id;
      }
      setCurrent(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    // Phones read it once at the top; wide screens keep it beside the text as a sticky rail.
    <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
      <p className="type-eyebrow text-ink-secondary">On this page</p>
      <ol className="mt-4 flex flex-col gap-1 border-l border-hairline">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={current === section.id ? "location" : undefined}
              className="-ml-px block rounded-r-sm border-l border-transparent py-1.5 pl-4 text-sm font-medium text-ink-secondary transition-colors duration-150 hover:border-ink hover:text-ink focus-visible:border-ink aria-[current=location]:border-ink aria-[current=location]:text-ink pointer-coarse:py-3"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
