"use client";

import { Plus } from "lucide-react";
import { Accordion } from "radix-ui";

const FAQS = [
  {
    q: "Is ScholarLens free? Do I need an account?",
    a: "It's free to use and there's no account. Open the checker, describe your situation, and you get a result in under a minute.",
  },
  {
    q: "What happens to what I type?",
    a: "Your description is used to answer that one check and nothing is stored after your result. There are no profiles and no sign-ups, so there's nothing to delete later.",
  },
  {
    q: "Which programs can it check?",
    a: "Ten federal and state programs live in the knowledge base today, including the Pell Grant, Cal Grant, Georgia HOPE, and New York TAP. If your question is about something outside that set, the agent can search official sources on the web, and it still has to quote the rule it relies on.",
  },
  {
    q: "Does \"eligible\" mean I'll get the award?",
    a: "No. ScholarLens checks whether you meet the published eligibility rules, not your chances of an award, which can depend on funding, deadlines, and the program's own review. Always confirm with the program before you apply.",
  },
  {
    q: "What if it can't find a rule for my situation?",
    a: "It says so. A result without a quoted rule is never marked eligible, and if the answer depends on something you didn't mention, like your enrollment status, it lists exactly what's missing instead of guessing.",
  },
];

export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="flex flex-col border-t border-hairline">
      {FAQS.map((item) => (
        <Accordion.Item key={item.q} value={item.q} className="border-b border-hairline">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 rounded-sm py-6 text-left font-display text-xl text-ink sm:text-[22px]">
              {item.q}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-secondary transition-[background-color,border-color,color] duration-150 group-hover:border-ink-secondary group-hover:text-ink group-data-[state=open]:border-brown group-data-[state=open]:bg-brown group-data-[state=open]:text-paper">
                <Plus
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-45"
                />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_160ms_var(--ease-out-strong)] data-[state=open]:animate-[accordion-down_220ms_var(--ease-out-strong)] motion-reduce:animate-none">
            <p className="max-w-170 pb-6 text-[17px] leading-relaxed text-ink-secondary">{item.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
