import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnnotatedRules } from "@/components/landing/AnnotatedRules";
import { Faq } from "@/components/landing/Faq";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { ProgramList } from "@/components/landing/ProgramList";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DrawLine } from "@/components/motion/DrawLine";
import { MarkerUnderline } from "@/components/motion/MarkerUnderline";
import { Reveal } from "@/components/motion/Reveal";
import { RulesReviewed } from "@/components/programs/RulesReviewed";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { AUTHOR_NAME, AUTHOR_URL, HOME_DESCRIPTION, HOME_FULL_TITLE, HOME_TITLE, pageMetadata } from "@/lib/site";
import { HOME_JSON_LD } from "@/lib/structured-data";

export const metadata: Metadata = {
  ...pageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" }),
  // The layout's title template only reaches nested segments, not this page beside it.
  title: { absolute: HOME_FULL_TITLE },
};

const STEPS = [
  {
    title: "Describe your situation",
    body: "Write it the way you'd tell a counselor. Add your family income, where you live, your grades, or what you plan to study if you know them.",
  },
  {
    title: "ScholarLens reads the rules",
    body: "It starts with the program rules we've reviewed, and searches official websites only for programs outside that list.",
  },
  {
    title: "Get a cited answer",
    body: "Eligible, partial, or not eligible, with the exact clause it relied on and a link to the source.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={HOME_JSON_LD} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto flex max-w-280 flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <div className="max-w-200 animate-rise-in">
              <h1 className="font-display type-h1 text-ink">
                A scholarship and grant eligibility checker that{" "}
                {/* The phrase never wraps internally, so the stroke stays under it
                    wherever the headline breaks. */}
                <span className="relative inline-block">
                  shows its sources.
                  <MarkerUnderline className="absolute inset-x-0 -bottom-2 h-3 w-full sm:-bottom-3 sm:h-4" />
                </span>
              </h1>
            </div>
            <div className="mt-6 max-w-140 animate-rise-in [animation-delay:60ms]">
              <p className="text-lg leading-relaxed text-ink-secondary sm:text-xl">
                Describe your situation the way you would to a counselor. ScholarLens checks it
                against the rules of ten US programs we&apos;ve reviewed, and searches official
                websites for everything else.
              </p>
            </div>
            <div className="mt-8 flex animate-rise-in flex-col items-center gap-3 [animation-delay:120ms]">
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/check">
                    Check your eligibility
                    <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>
              <p className="text-sm text-ink-secondary">You don&apos;t need an account, and nothing you type is stored.</p>
            </div>
          </div>

          <div className="relative px-4 pb-16 sm:px-6 sm:pb-20">
            <div aria-hidden="true" className="absolute inset-x-0 top-1/3 bottom-0 bg-tint" />
            <div className="relative">
              <HeroPreview />
            </div>
          </div>
        </section>

        <AnnotatedRules />

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-tint py-24 md:py-32">
          <div className="mx-auto flex max-w-280 flex-col gap-14 px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display type-h2 max-w-140">It takes three steps, starting with your own words.</h2>
            </Reveal>
            <div className="relative">
              <DrawLine className="absolute top-5 right-0 left-0 hidden h-px bg-input md:block" />
              <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <Reveal delay={0.15 + index * 0.08} className="flex flex-col gap-4">
                      <span className="flex size-10 items-center justify-center rounded-full border border-input bg-paper font-display text-lg text-ink">
                        {index + 1}
                      </span>
                      <h3 className="text-xl font-semibold text-ink">{step.title}</h3>
                      <p className="max-w-80 text-body-sm leading-relaxed text-ink-secondary">{step.body}</p>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
            <Reveal delay={0.4}>
              <Button asChild size="lg">
                <Link href="/check">
                  Check your eligibility
                  <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* Programs */}
        <section id="programs" className="mx-auto flex max-w-280 scroll-mt-20 flex-col gap-10 px-4 py-24 sm:px-6 md:py-32">
          <Reveal className="flex max-w-170 flex-col gap-4">
            <h2 className="font-display type-h2">
              We&apos;ve reviewed the rules for ten US programs, from the Pell Grant to state grant
              programs.
            </h2>
            <p className="text-body-lg leading-relaxed text-ink-secondary">
              Questions about any other program, including ones outside the US, are answered from
              official websites, and the result says so.
            </p>
            <RulesReviewed className="text-caption text-ink-secondary" />
          </Reveal>
          <Reveal delay={0.08}>
            <ProgramList />
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-tint">
          <div className="mx-auto grid max-w-280 gap-10 px-4 py-24 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:py-32">
            <Reveal className="flex flex-col gap-4">
              <h2 className="font-display type-h2">Common questions</h2>
              <p className="text-body-sm leading-relaxed text-ink-secondary">
                The methodology page explains{" "}
                <Link href="/methodology" className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink">
                  how ScholarLens reads the rules and where its limits are
                </Link>
                .
              </p>
              {/* One sentence doesn't need its own section, but the footer's About link
                  still lands here. */}
              <div id="about" className="mt-6 flex scroll-mt-20 flex-col gap-2 border-t border-hairline pt-6">
                <h3 className="text-lg font-semibold text-ink">Who built ScholarLens</h3>
                <p className="text-body-sm leading-relaxed text-ink-secondary">
                  ScholarLens is an independent project by{" "}
                  <a href={AUTHOR_URL} className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink">
                    {AUTHOR_NAME}
                  </a>
                  . It isn&apos;t affiliated with the U.S. Department of Education, any state agency,
                  or any of the programs it covers.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-24 sm:px-6">
          <Reveal className="mx-auto max-w-280">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-brown px-6 py-16 text-center text-paper sm:py-20">
              <h2 className="font-display type-h2 max-w-160">Find out what you qualify for in about a minute.</h2>
              <p className="max-w-120 text-lg text-paper/75">You won&apos;t need an account, nothing you type is saved, and every result comes with the rule it relies on.</p>
              <Button asChild size="lg" className="bg-paper text-brown hover:bg-tint">
                <Link href="/check">
                  Check your eligibility
                  <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
