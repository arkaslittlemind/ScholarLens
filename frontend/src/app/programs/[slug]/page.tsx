import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { type Block, formatReviewedDate, getProgram, getPrograms, type Program } from "@/lib/corpus";
import { programPath } from "@/lib/programs";
import { pageMetadata } from "@/lib/site";
import { programJsonLd } from "@/lib/structured-data";

// Every program is known at build time; anything else is the site's 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getPrograms().map((program) => ({ slug: program.slug }));
}

function scopeLabel(program: Program): string {
  return program.scope === "Federal" ? "federal" : `${program.scope} state`;
}

function describe(program: Program): string {
  return `The ${program.name} eligibility rules ScholarLens checks your situation against, last reviewed ${formatReviewedDate(program.reviewed)}, with a link to the official source.`;
}

function loadProgram(slug: string): Program {
  const program = getProgram(slug);
  if (!program) notFound();
  return program;
}

export async function generateMetadata({ params }: PageProps<"/programs/[slug]">): Promise<Metadata> {
  const program = loadProgram((await params).slug);
  return pageMetadata({
    title: `${program.name} eligibility requirements`,
    description: describe(program),
    path: programPath(program.slug),
  });
}

function RuleBlock({ block }: { block: Block }) {
  if (block.kind === "heading") {
    return <h2 className="mt-6 font-display text-title leading-tight text-ink first:mt-0">{block.text}</h2>;
  }
  if (block.kind === "list") {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-rust">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p>{block.text}</p>;
}

export default async function ProgramPage({ params }: PageProps<"/programs/[slug]">) {
  const program = loadProgram((await params).slug);
  const officialHost = new URL(program.url).hostname.replace(/^www\./, "");
  const officiallyCalled = program.officialName === program.name ? "" : `, officially called ${program.officialName}`;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <JsonLd data={programJsonLd({ name: program.name, path: programPath(program.slug) })} />

      <main className="flex-1">
        <section className="border-b border-hairline bg-tint">
          <div className="mx-auto flex max-w-280 flex-col gap-4 px-4 py-16 sm:px-6 sm:py-20">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-secondary">
                <li>
                  <Link href="/" className="rounded-sm transition-colors duration-150 hover:text-ink">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/programs" className="rounded-sm transition-colors duration-150 hover:text-ink">
                    Programs
                  </Link>
                </li>
              </ol>
            </nav>
            <h1 className="font-display type-h1 max-w-200 text-ink">{program.name} eligibility requirements</h1>
            <p className="max-w-150 text-lg leading-relaxed text-ink-secondary sm:text-xl">
              {program.name} is a {scopeLabel(program)} aid program{officiallyCalled}.
            </p>
            <p className="text-sm font-semibold text-ink-secondary">
              Rules last reviewed{" "}
              <time dateTime={program.reviewed}>
                {formatReviewedDate(program.reviewed)}
              </time>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-280 px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex max-w-180 flex-col gap-12">
            <div className="flex flex-col gap-4 text-body-lg leading-relaxed text-ink-secondary">
              {program.blocks.map((block, index) => (
                <RuleBlock key={index} block={block} />
              ))}
            </div>

            <section aria-labelledby="source-heading" className="flex flex-col gap-3 rounded-xl border border-hairline p-6">
              <h2 id="source-heading" className="font-display text-title-sm text-ink">
                Where these rules come from
              </h2>
              <p className="text-body-sm leading-relaxed text-ink-secondary">
                This page is ScholarLens&apos;s summary of the official rules, and it is the same text the
                eligibility checker cites when it answers. Rules change between award years, so confirm
                the details with the program before you apply.
              </p>
              <p className="text-sm text-ink-secondary">{program.document}</p>
              <a
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 rounded-sm text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 transition-colors duration-150 hover:decoration-ink pointer-coarse:min-h-11"
              >
                Read the official rules on {officialHost}
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="text-body-sm text-ink-secondary">
                You can also read{" "}
                <Link href="/methodology" className="rounded-sm font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
                  how ScholarLens checks your situation against these rules
                </Link>
                .
              </p>
            </section>

            <section className="flex flex-col items-start gap-5 rounded-2xl bg-brown p-8 text-paper sm:p-10">
              <h2 className="font-display text-title leading-tight sm:text-title-lg">See whether you qualify</h2>
              <p className="max-w-110 text-paper/75">
                Describe your situation and ScholarLens checks it against these rules and the other programs
                it covers, quoting the rule behind each answer.
              </p>
              <Button asChild size="lg" className="bg-paper text-brown hover:bg-tint">
                <Link href="/check">
                  Check your eligibility
                  <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
