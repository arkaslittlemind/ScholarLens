import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { OnThisPage } from "@/components/methodology/OnThisPage";
import { Section } from "@/components/methodology/Section";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { COVERED_PROGRAMS } from "@/lib/programs";
import { pageMetadata } from "@/lib/site";
import { HOW_ITS_BUILT_JSON_LD } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "How the eligibility checker is built and measured",
  description:
    "The architecture behind the ScholarLens eligibility checker, how one check runs, and how its answers are measured on a hand-labeled evaluation set.",
  path: "/methodology/how-its-built",
});

const REPO_URL = "https://github.com/arkaslittlemind/ScholarLens";

const SECTIONS = [
  { id: "architecture", label: "What runs where" },
  { id: "one-check", label: "One check, start to finish" },
  { id: "evaluation", label: "How answers are measured" },
  { id: "failures", label: "When something fails" },
  { id: "privacy", label: "What it keeps" },
];

const PARTS = [
  {
    term: "Frontend",
    body: "Next.js on Vercel. It sends the student's description to the API, and no API key ever reaches the browser.",
  },
  {
    term: "API",
    body: "FastAPI on Railway. Every request and response is validated with Pydantic, and each visitor has a rate limit.",
  },
  {
    term: "Agent",
    body: "Pydantic AI running Google Gemini (gemini-3.8-flash). It has two tools and decides which to call for each question.",
  },
  {
    term: "Knowledge base",
    body: `ChromaDB, holding the ${COVERED_PROGRAMS.length} program documents embedded with gemini-embedding-001. Documents are split into passages of up to 1,200 characters with no overlap, so a quoted clause stays whole, and a search returns the five closest passages.`,
  },
  {
    term: "Web search",
    body: "Tavily, called only when the knowledge base doesn't cover the question.",
  },
  {
    term: "Observability",
    body: "OpenTelemetry traces, metrics, and logs sent to Grafana Cloud.",
  },
];

const STEPS = [
  "The API validates the request and checks the visitor's rate limit.",
  "The agent searches the knowledge base, every time and before anything else.",
  "If the passages it finds don't cover the question, it searches the web for the program's official pages.",
  "The model returns a typed result: the verdict, an explanation, the quoted clause, its source, anything missing, and the steps it took.",
  "A grounding check runs before the response is sent. An eligible or partial verdict needs a quoted clause and a matching source, and any alternative program whose link no tool returned is dropped.",
];

// From the 2026-10-27 evaluation run, the same figures as the README.
const METRICS = [
  {
    name: "Eligibility accuracy",
    meaning: "The verdict matches the one a person assigned to that profile.",
    result: "97.6%",
    target: "target above 80%",
  },
  {
    name: "Citation accuracy",
    meaning: "The quoted rule and the program both match the knowledge base.",
    result: "93.9%",
    target: "target above 70%",
  },
  {
    name: "Hallucination rate",
    meaning: "An eligible verdict with no citation, or a quoted rule that isn't in the knowledge base.",
    result: "0.0%",
    target: "target below 10%",
  },
  {
    name: "Consistency",
    meaning: "The same profile gets the same verdict on all three tries.",
    result: "92.9%",
    target: "no target",
  },
];

const LINK_CLASS =
  "rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors duration-150 hover:decoration-ink";

export default function HowItsBuilt() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={HOW_ITS_BUILT_JSON_LD} />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-4 px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="font-display type-h1 max-w-200 animate-rise-in text-ink">
              How ScholarLens is built and measured.
            </h1>
            <p className="max-w-150 animate-rise-in text-lg leading-relaxed text-ink-secondary [animation-delay:60ms] sm:text-xl">
              The technical side of the eligibility checker, for engineers and for anyone who wants
              to test the claims on the{" "}
              <Link href="/methodology" className={LINK_CLASS}>
                methodology page
              </Link>
              . Everything here matches the source code and the latest evaluation run.
            </p>
          </div>
        </section>

        <div className="mx-auto grid grid-cols-1 max-w-280 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20 lg:py-24">
          <OnThisPage sections={SECTIONS} />

          <div className="flex max-w-180 flex-col gap-16">
            <Section id="architecture" number={1} title="Two services and an agent with two tools.">
              <p>
                The browser talks to one API, and the API runs one agent. The agent can read the
                curated knowledge base or search the web, and it chooses between them for each
                question.
              </p>
              <dl className="flex flex-col divide-y divide-hairline border-y border-hairline text-body-sm">
                {PARTS.map((part) => (
                  <div key={part.term} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                    <dt className="font-semibold text-ink sm:w-32 sm:shrink-0">{part.term}</dt>
                    <dd>{part.body}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section id="one-check" number={2} title="One check, start to finish.">
              <ol className="flex max-w-prose list-decimal flex-col gap-3 pl-6 marker:font-display marker:text-rust-text">
                {STEPS.map((step) => (
                  <li key={step} className="pl-1">
                    {step}
                  </li>
                ))}
              </ol>
              <p>
                The whole check runs inside a 45-second budget, and every call to the model, the
                knowledge base, and the web search has its own timeout inside it.
              </p>
            </Section>

            <Section id="evaluation" number={3} title="How the answers are measured.">
              <p>
                The agent is tested on 28 student profiles that a person labeled by hand, each
                answered three times for 84 answers in all. The latest run was on 27 October 2026
                against the full knowledge base, with the same model the live site uses.
              </p>
              <dl className="flex flex-col divide-y divide-hairline border-y border-hairline">
                {METRICS.map((metric) => (
                  <div key={metric.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 py-4">
                    <dt className="font-semibold text-ink">{metric.name}</dt>
                    <dd className="row-span-2 text-right">
                      <span className="block font-display text-title-sm text-ink tabular-nums">{metric.result}</span>
                      <span className="block text-caption">{metric.target}</span>
                    </dd>
                    <dd className="text-body-sm">{metric.meaning}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Answers took 8.9 seconds on average: 8.4 seconds when the knowledge base was enough,
                and 12.8 seconds when the agent also searched the web. Every citation miss named the
                right program but quoted a different clause of it than the label expected.
              </p>
            </Section>

            <Section id="failures" number={4} title="When something fails.">
              <p>
                A visitor who runs too many checks gets a 429 response with a Retry-After header,
                and the check page tells them how long to wait. A timeout, a tool outage, or a limit
                at the model provider returns a 503 instead. When the provider asks for a short wait
                that still fits inside the time budget, the agent retries once before giving up.
              </p>
              <p>
                In every case the student sees a plain message and their description stays in the
                form. The service never fills a gap with a guessed answer.
              </p>
            </Section>

            <Section id="privacy" number={5} title="What it keeps.">
              <p>
                There are no accounts, no saved profiles, and no database of students. Logs and
                traces record that a check ran, how long it took, and which tools it used, but never
                what the student wrote or what the tools sent back.
              </p>
            </Section>

            <Reveal className="flex flex-col items-start gap-5 rounded-2xl bg-brown p-8 text-paper sm:p-10">
              <h2 className="font-display text-title leading-tight sm:text-title-lg">Read the source</h2>
              <p className="max-w-110 text-paper/75">
                The code, the evaluation profiles, and the program documents the agent quotes are all
                in the repository.
              </p>
              <Button asChild size="lg" className="bg-paper text-brown hover:bg-tint">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  View ScholarLens on GitHub
                  <span className="sr-only"> (opens in a new tab)</span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
            </Reveal>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
