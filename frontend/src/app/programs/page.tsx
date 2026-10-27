import { ArrowRight, BookOpenCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RulesReviewed } from "@/components/programs/RulesReviewed";
import { JsonLd } from "@/components/seo/JsonLd";
import { COVERED_PROGRAMS, programPath } from "@/lib/programs";
import { pageMetadata } from "@/lib/site";
import { PROGRAMS_JSON_LD } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Scholarship and grant eligibility requirements by program",
  description:
    "Eligibility requirements for the Pell Grant, Cal Grant, NY TAP and the other federal and state programs ScholarLens covers, with links to the official rules.",
  path: "/programs",
});

export default function Programs() {
  const scopes = [...new Set(COVERED_PROGRAMS.map((program) => program.scope))];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={PROGRAMS_JSON_LD} />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-4 px-4 py-16 sm:px-6 sm:py-20">
            <p className="type-eyebrow text-rust-text">Programs</p>
            <h1 className="font-display type-h1 max-w-200 text-ink">
              Eligibility requirements for every program ScholarLens covers
            </h1>
            <p className="max-w-150 text-lg leading-relaxed text-ink-secondary sm:text-xl">
              ScholarLens checks your situation against the published rules for {COVERED_PROGRAMS.length}{" "}
              federal and state programs. Each page lists one program&apos;s eligibility rules, when they
              were last reviewed, and a link to the official source.
            </p>
            <RulesReviewed className="text-sm font-semibold text-ink-secondary" />
          </div>
        </section>

        <div className="mx-auto grid grid-cols-1 max-w-280 items-start gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 sm:py-20 lg:grid-cols-3">
          {scopes.map((scope) => {
            const headingId = `scope-${scope.toLowerCase().replaceAll(" ", "-")}`;
            return (
              <section key={scope} aria-labelledby={headingId} className="flex flex-col gap-3 rounded-xl border border-hairline p-5">
                <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <BookOpenCheck aria-hidden="true" className="size-4 text-sage-text" />
                  {scope}
                </h2>
                <ul className="flex flex-col gap-1">
                  {COVERED_PROGRAMS.filter((program) => program.scope === scope).map((program) => (
                    <li key={program.slug}>
                      <Link
                        href={programPath(program.slug)}
                        className="group flex items-center justify-between gap-3 rounded-md py-2 font-display text-body-lg text-ink transition-colors duration-150 hover:text-rust-text pointer-coarse:min-h-11"
                      >
                        {program.name}
                        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-secondary transition-transform duration-150 motion-safe:pointer-fine:group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
