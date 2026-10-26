import type { Metadata } from "next";
import Link from "next/link";
import { EligibilityChecker } from "@/components/check/EligibilityChecker";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { COVERED_PROGRAMS, programPath } from "@/lib/programs";
import { CHECK_DESCRIPTION, pageMetadata } from "@/lib/site";
import { CHECK_JSON_LD } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Check your scholarship and grant eligibility",
  description: CHECK_DESCRIPTION,
  path: "/check",
});

const TIPS = [
  "Your year in school and whether you already hold a degree",
  "Your country and citizenship, and your state or region",
  "Your family's yearly income, in your own currency",
  "In the US, whether you've filed the FAFSA, the federal student aid form",
  "The program you're asking about, if you have one in mind",
];

export default function Check() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={CHECK_JSON_LD} />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-3 px-4 py-12 sm:px-6 sm:py-16">
            <h1 className="font-display type-h2 text-ink">Check your eligibility</h1>
            <p className="max-w-150 text-lg leading-relaxed text-ink-secondary">
              Describe your situation and we&apos;ll tell you where you stand, with the exact rule
              behind the result.
            </p>
            {/* On wide screens the aside says this beside the form; below lg the aside falls
                after it, so a student abroad would otherwise learn the scope only after submitting. */}
            <p className="max-w-150 text-body-sm leading-relaxed text-ink-secondary lg:hidden">
              We&apos;ve reviewed {COVERED_PROGRAMS.length} US programs in detail. For anything else,
              including programs outside the US, we search official websites and tell you so.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-280 gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div className="min-w-0">
            <EligibilityChecker />
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-hairline p-6">
              <h2 className="font-display text-xl text-ink">What helps the check</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex gap-3 text-sm leading-relaxed text-ink-secondary">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rust" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-hairline p-6">
              <h2 className="font-display text-xl text-ink">
                The {COVERED_PROGRAMS.length} US programs we&apos;ve reviewed
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {COVERED_PROGRAMS.map((program) => (
                  <li key={program.name}>
                    <Link
                      href={programPath(program.slug)}
                      className="inline-flex rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors duration-150 hover:bg-hairline hover:text-ink pointer-coarse:min-h-11 pointer-coarse:items-center pointer-coarse:px-3.5"
                    >
                      {program.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                For anything else, including programs outside the US, the agent searches official
                websites instead, and your result says so. The methodology explains{" "}
                <Link href="/methodology" className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink">
                  how the agent decides where to look
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
