import { ArrowRight, BookOpenCheck, CheckCircle2, CircleDot, Globe, Quote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Faq } from "@/components/landing/Faq";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { ProgramRail } from "@/components/landing/ProgramRail";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DrawLine } from "@/components/motion/DrawLine";
import { MarkerUnderline } from "@/components/motion/MarkerUnderline";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { HOME_DESCRIPTION, HOME_FULL_TITLE, HOME_TITLE, pageMetadata } from "@/lib/site";
import { HOME_JSON_LD } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  ...pageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" }),
  // The layout's title template only reaches nested segments, not this page beside it.
  title: { absolute: HOME_FULL_TITLE },
};

const PROBLEMS = [
  {
    title: "Rules are buried",
    body: "Income limits, enrollment rules, and residency terms sit deep inside long policy documents.",
  },
  {
    title: "Every program words it differently",
    body: "One state asks about your \"Student Aid Index\" while another asks about \"family income\", so comparing programs side by side takes real work.",
  },
  {
    title: "Chatbots sound sure and cite nothing",
    body: "A confident yes with no source is worse than no answer when real money is at stake.",
  },
];

const STEPS = [
  {
    title: "Describe your situation",
    body: "Write it the way you'd tell a counselor. Add income, state, GPA, or major if you know them.",
  },
  {
    title: "The agent reads the rules",
    body: "It searches the program knowledge base first, and checks official sources on the web only when it needs to.",
  },
  {
    title: "Get a cited answer",
    body: "Eligible, partial, or not eligible, with the exact clause it relied on and a link to the source.",
  },
];

function Eyebrow({ children }: { children: string }) {
  return <p className="type-eyebrow text-rust-text">{children}</p>;
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}

function FeatureCard({ icon, title, body, children }: FeatureCardProps) {
  return (
    // The lift shadow lives on ::after and fades by opacity, so hovering never
    // repaints a box-shadow. It sits outside the card because overflow-hidden would clip it.
    <div className="relative isolate h-full transition-[translate] duration-200 ease-out-strong after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-2xl after:opacity-0 after:shadow-lift after:transition-opacity after:duration-200 after:ease-out-strong hover-fine:-translate-y-0.5 hover-fine:after:opacity-100 motion-reduce:translate-none!">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card">
        <div className="flex min-h-44 items-center justify-center border-b border-hairline bg-tint/70 p-6">
          {children}
        </div>
        <div className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-2 text-ink">
            {icon}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-body-sm leading-relaxed text-ink-secondary">{body}</p>
        </div>
      </div>
    </div>
  );
}

function CitedVisual() {
  return (
    <div className="w-full max-w-70 rounded-lg border border-hairline bg-paper p-4 shadow-card">
      <p className="text-xs font-semibold text-ink">The rule</p>
      <p className="mt-1.5 border-l-2 border-rust pl-3 font-display text-body-sm leading-snug text-ink">
        &ldquo;Must be a <mark className="bg-rust-tint text-ink">U.S. citizen or eligible non-citizen</mark>.&rdquo;
      </p>
    </div>
  );
}

function PartialVisual() {
  return (
    <div className="flex w-full max-w-70 flex-col gap-3 rounded-lg border border-hairline bg-paper p-4 shadow-card">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rust-tint px-2.5 py-1 text-xs font-semibold text-rust-text">
        <CircleDot aria-hidden="true" className="size-3.5" />
        Partial match
      </span>
      <div className="rounded-md border border-dashed border-input p-2.5 text-caption text-ink-secondary">
        Could change with: <span className="font-semibold text-ink">your enrollment status</span>
      </div>
    </div>
  );
}

function RouteVisual() {
  return (
    <div className="flex w-full max-w-70 flex-col gap-2">
      <div className="flex items-center gap-3 rounded-lg border border-hairline bg-paper p-3 shadow-card">
        <BookOpenCheck aria-hidden="true" className="size-4 text-sage-text" />
        <span className="text-caption font-semibold text-ink">Program knowledge base</span>
        <span className="ml-auto text-xs text-ink-secondary">always first</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-input bg-paper/60 p-3">
        <Globe aria-hidden="true" className="size-4 text-ink-secondary" />
        <span className="text-caption font-semibold text-ink-secondary">Official sources</span>
        <span className="ml-auto text-xs text-ink-secondary">if needed</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={HOME_JSON_LD} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto flex max-w-280 flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <div className="animate-rise-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper px-3 py-1 text-caption font-semibold text-ink-secondary shadow-card">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-sage" />
                Scholarship eligibility, with receipts
              </p>
            </div>
            <div className="mt-6 max-w-200 animate-rise-in [animation-delay:60ms]">
              <h1 className="font-display type-h1 text-ink">
                See which scholarships you qualify for, and why.
              </h1>
              {/* Its own block under the headline, not anchored to a word, so it
                  can't land mispositioned when the wrap point shifts. */}
              <MarkerUnderline className="mx-auto mt-1 h-3 w-60 translate-x-6 sm:mt-2 sm:h-4 sm:w-100 sm:translate-x-24" />
            </div>
            <div className="mt-6 max-w-140 animate-rise-in [animation-delay:120ms]">
              <p className="text-lg leading-relaxed text-ink-secondary sm:text-xl">
                Describe your situation the way you would to a counselor, and ScholarLens checks it
                against the official rules for each program.
              </p>
            </div>
            <div className="mt-8 flex animate-rise-in flex-col items-center gap-3 [animation-delay:180ms]">
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

        {/* Programs */}
        <section id="programs" className="scroll-mt-20 bg-tint pb-20">
          <div className="mx-auto flex max-w-280 flex-col items-center gap-6 px-4 sm:px-6">
            <p className="text-sm font-semibold text-ink-secondary">
              ScholarLens reads the published rules for ten federal and state programs
            </p>
          </div>
          <div className="mt-6">
            <ProgramRail />
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto grid max-w-280 gap-12 px-4 py-24 sm:px-6 md:grid-cols-[1fr_1.1fr] md:py-32">
          <Reveal className="flex flex-col gap-4">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="font-display type-h2 max-w-120">
              Eligibility rules are written for program staff, and students are left to decode them.
            </h2>
          </Reveal>
          <ul className="flex flex-col gap-6">
            {PROBLEMS.map((problem, index) => (
              <li key={problem.title} className="border-b border-hairline pb-6 last:border-none">
                <Reveal delay={index * 0.08} className="flex gap-4">
                  <span className="font-display text-2xl leading-none text-rust-text">0{index + 1}</span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold text-ink">{problem.title}</h3>
                    <p className="text-body-sm leading-relaxed text-ink-secondary">{problem.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section className="mx-auto flex max-w-280 flex-col gap-12 px-4 pb-24 sm:px-6 md:pb-32">
          <Reveal className="flex flex-col items-center gap-4 text-center">
            <Eyebrow>Why ScholarLens</Eyebrow>
            <h2 className="font-display type-h2 max-w-160">An answer you can check for yourself.</h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            <Reveal delay={0}>
              <FeatureCard
                icon={<Quote aria-hidden="true" className="size-4.5 text-rust" />}
                title="Every answer shows its source"
                body="Every answer quotes the clause it came from and links the source document, so you can verify it in seconds."
              >
                <CitedVisual />
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.08}>
              <FeatureCard
                icon={<CircleDot aria-hidden="true" className="size-4.5 text-rust" />}
                title="Partial matches count"
                body="Eligibility is rarely a clean yes or no, so your result shows which rules you meet, what is still missing, and what would change the answer."
              >
                <PartialVisual />
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.16}>
              <FeatureCard
                icon={<Globe aria-hidden="true" className="size-4.5 text-rust" />}
                title="Knows where to look"
                body="An agent decides per question whether the knowledge base covers it or official web sources are needed."
              >
                <RouteVisual />
              </FeatureCard>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 bg-tint py-24 md:py-32">
          <div className="mx-auto flex max-w-280 flex-col gap-14 px-4 sm:px-6">
            <Reveal className="flex flex-col gap-4">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display type-h2 max-w-140">It takes three steps and usually about a minute.</h2>
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
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto grid max-w-280 scroll-mt-16 gap-10 px-4 py-24 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:py-32">
          <Reveal className="flex flex-col gap-4">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-display type-h2">What people usually ask first</h2>
            <p className="text-body-sm leading-relaxed text-ink-secondary">
              Want the detail on sources and limits?{" "}
              <Link href="/methodology" className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink">
                Read the methodology
              </Link>
              .
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <Faq />
          </Reveal>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <Reveal className="mx-auto max-w-280">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl bg-brown px-6 py-16 text-center text-paper sm:py-20">
              <CheckCircle2 aria-hidden="true" className="size-8 text-rust" />
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
