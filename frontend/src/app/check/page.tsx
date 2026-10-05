import Link from "next/link";
import { EligibilityChecker } from "@/components/check/EligibilityChecker";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/motion/Reveal";
import { COVERED_PROGRAMS } from "@/lib/programs";

const TIPS = [
  "Your year in school and whether you already hold a degree",
  "Citizenship or residency, and the state you live in",
  "Whether you've filed the FAFSA, and your household income",
  "The program you're asking about, if you have one in mind",
];

export default function Check() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-3 px-4 py-12 sm:px-6 sm:py-16">
            <Reveal>
              <p className="type-eyebrow text-rust-text">Eligibility check</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="font-display type-h2 text-ink">Check your eligibility</h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="max-w-150 text-lg leading-relaxed text-ink-secondary">
                Describe your situation and we&apos;ll tell you where you stand, with the exact rule
                behind the result.
              </p>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto grid max-w-280 gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <Reveal delay={0.1} className="min-w-0">
            <EligibilityChecker />
          </Reveal>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <Reveal delay={0.18} className="rounded-2xl border border-hairline p-6">
              <h2 className="font-display text-xl text-ink">What helps the check</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex gap-3 text-sm leading-relaxed text-ink-secondary">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rust" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.24} className="rounded-2xl border border-hairline p-6">
              <h2 className="font-display text-xl text-ink">Programs in the knowledge base</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {COVERED_PROGRAMS.map((program) => (
                  <li key={program.name} className="rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-ink-secondary">
                    {program.name}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                Asking about something else? The agent can check official sources on the web.{" "}
                <Link href="/methodology" className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink">
                  How it decides
                </Link>
              </p>
            </Reveal>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
