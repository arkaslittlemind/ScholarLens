import { ArrowRight, CheckCircle2, CircleDot, CircleMinus, Globe, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AnnotatedResult } from "@/components/methodology/AnnotatedResult";
import { OnThisPage } from "@/components/methodology/OnThisPage";
import { Section } from "@/components/methodology/Section";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { COVERED_PROGRAMS, programPath } from "@/lib/programs";
import { pageMetadata } from "@/lib/site";
import { METHODOLOGY_JSON_LD } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "How the scholarship eligibility checker works",
  description:
    "How ScholarLens reads official program rules, when it searches the web, and why it never calls you eligible without quoting the rule it relied on.",
  path: "/methodology",
});

const SECTIONS = [
  { id: "knowledge-base", label: "The knowledge base" },
  { id: "looking-further", label: "Looking further" },
  { id: "no-rule-no-yes", label: "Why every yes needs a rule" },
  { id: "what-you-get", label: "What you get back" },
  { id: "limits", label: "What it doesn't do" },
];

const VERDICTS = [
  {
    icon: CheckCircle2,
    label: "Eligible",
    className: "bg-sage-tint text-sage-text",
    body: "You meet the rule that was quoted.",
  },
  {
    icon: CircleDot,
    label: "Partial match",
    className: "bg-rust-tint text-rust-text",
    body: "You meet some rules, or the answer depends on something you didn't say.",
  },
  {
    icon: XCircle,
    label: "Not eligible",
    className: "border border-input text-ink",
    body: "The quoted rule shows why you don't qualify.",
  },
];

const LIMITS = [
  "It checks published eligibility rules, not your chances of an award. Funding, deadlines, and each program's own review still apply.",
  "It doesn't keep what you type. There are no accounts and no saved profiles.",
  "Rules change between award years. Always confirm with the program before you apply.",
];

const LINK_CLASS =
  "rounded-sm text-ink underline decoration-input underline-offset-4 transition-colors duration-150 hover:decoration-ink";

export default function Methodology() {
  const scopes = [...new Set(COVERED_PROGRAMS.map((program) => program.scope))];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={METHODOLOGY_JSON_LD} />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-4 px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="font-display type-h1 max-w-200 animate-rise-in text-ink">
              How ScholarLens reaches an answer.
            </h1>
            <p className="max-w-150 animate-rise-in text-lg leading-relaxed text-ink-secondary [animation-delay:60ms] sm:text-xl">
              An AI agent, a language model that decides for itself where to look, reads the official
              rules for you. Here is where it looks, what it is not allowed to do, and what comes back.
            </p>
          </div>
        </section>

        <div className="mx-auto grid grid-cols-1 max-w-280 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20 lg:py-24">
          <OnThisPage sections={SECTIONS} />

          <div className="flex max-w-180 flex-col gap-16">
            <Section id="knowledge-base" number={1} title="It reads the knowledge base first.">
              <p>
                Every question starts with a search of a curated knowledge base: the published
                eligibility rules for {COVERED_PROGRAMS.length} US programs, federal and state,
                collected from each program&apos;s official site. They are split into short passages
                so the agent can find the exact rule that applies to you and quote it.
              </p>
              <dl className="flex flex-col gap-3 rounded-xl border border-hairline p-4 text-body-sm sm:p-5">
                {scopes.map((scope) => (
                  <div key={scope} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="font-semibold text-ink sm:w-28 sm:shrink-0">{scope}</dt>
                    <dd>
                      {COVERED_PROGRAMS.filter((program) => program.scope === scope).map((program, index) => (
                        <span key={program.slug}>
                          {index > 0 && ", "}
                          <Link href={programPath(program.slug)} className={LINK_CLASS}>
                            {program.name}
                          </Link>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section id="looking-further" number={2} title="It looks further only when it needs to.">
              <p>
                If the knowledge base doesn&apos;t cover your question, for example a program outside
                that list or a country other than the US, the agent searches the web for official
                program information. When that happens, &ldquo;Checking official sources&rdquo; shows
                up in the steps on your result and the result is labeled as found on the web, so you
                always know where an answer came from.
              </p>
              <div className="flex max-w-prose items-start gap-3 rounded-xl border border-hairline p-4 text-body-sm">
                <Globe aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
                <span>
                  If you&apos;re studying outside the US, your answers come from this web search,
                  because every program in the knowledge base is a US program. Questions about the
                  programs above usually never leave it.
                </span>
              </div>
            </Section>

            <Section id="no-rule-no-yes" number={3} title="It won't give a positive answer without a quoted rule.">
              <p>
                The agent is not allowed to call you eligible, or even a partial match, without quoting
                the clause it relied on and naming its source. If a rule depends on something you
                didn&apos;t mention, it lists that instead of guessing.
              </p>
              <ul className="flex flex-col gap-3">
                {VERDICTS.map((verdict) => (
                  <li key={verdict.label} className="flex flex-col gap-2 rounded-xl border border-hairline p-4 sm:flex-row sm:items-center sm:gap-4">
                    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${verdict.className}`}>
                      <verdict.icon aria-hidden="true" className="size-4" />
                      {verdict.label}
                    </span>
                    <span className="text-body-sm">{verdict.body}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="what-you-get" number={4} title="What you get back.">
              <p>
                Here is an example result for a student asking about Georgia&apos;s HOPE Scholarship.
                The rule is quoted exactly as the program publishes it, and each numbered part is
                explained underneath.
              </p>
              <AnnotatedResult />
            </Section>

            <Section id="limits" number={5} title="What it doesn't do.">
              <ul className="flex max-w-prose flex-col gap-4">
                {LIMITS.map((limit) => (
                  <li key={limit} className="flex gap-3">
                    <CircleMinus aria-hidden="true" className="mt-1 size-5 shrink-0 text-ink-secondary" />
                    {limit}
                  </li>
                ))}
              </ul>
              <p className="text-body-sm">
                If you want the technical side, there is a separate page on{" "}
                <Link href="/methodology/how-its-built" className={`font-semibold ${LINK_CLASS}`}>
                  how ScholarLens is built and how its answers are measured
                </Link>
                .
              </p>
            </Section>

            <Reveal className="flex flex-col items-start gap-5 rounded-2xl bg-brown p-8 text-paper sm:p-10">
              <h2 className="font-display text-title leading-tight sm:text-title-lg">Try it with your own situation</h2>
              <p className="max-w-110 text-paper/75">Describe your situation and get a cited answer in about a minute.</p>
              <Button asChild size="lg" className="bg-paper text-brown hover:bg-tint">
                <Link href="/check">
                  Check your eligibility
                  <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
