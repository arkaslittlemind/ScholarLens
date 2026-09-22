import { SiteHeader } from "@/components/layout/SiteHeader";

function StepCircle({ n }: { n: number }) {
  return (
    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-ink text-sm font-medium">
      {n}
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-ink bg-cream-paper p-8">
      <h3 className="text-2xl font-medium text-ink">{title}</h3>
      <p className="mt-3 text-lg text-graphite">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-cream-paper text-ink">
      <SiteHeader />

      <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-6 py-16 text-center">
        <h1 className="max-w-3xl text-[40px] leading-[1.25] font-medium tracking-[-0.016em] sm:text-[64px]">
          Find scholarships you actually qualify for, with the exact rule
          behind every match.
        </h1>
        <p className="max-w-[640px] text-lg text-graphite">
          ScholarLens reads eligibility rules so you don&apos;t have to. Answer
          a few questions and get a cited, auditable result: eligible,
          partial, or not yet.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/check"
            className="rounded-full bg-sunshine-highlight px-6 py-4 text-base font-medium text-ink"
          >
            Check your eligibility
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-ink px-6 py-4 text-base font-medium text-ink"
          >
            See how it works
          </a>
        </div>
        <p className="text-sm text-graphite">
          No account required. Nothing you enter is stored after your result.
        </p>
      </section>

      <section
        id="how-it-works"
        className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-6 py-16"
      >
        <span className="rounded-full border border-ink px-3 py-1 text-sm font-medium tracking-[0.286em] uppercase">
          How it works
        </span>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "Describe your situation", body: "Guided fields plus free text - income, state, GPA, major, and more." },
            { title: "Agent checks the rules", body: "It retrieves from the program corpus or searches the web, whichever the query needs." },
            { title: "Get a cited answer", body: "A verdict, a plain-language explanation, and the exact clause it came from." },
          ].map((step, i) => (
            <div key={step.title} className="rounded-3xl border border-ink p-6 text-center">
              <StepCircle n={i + 1} />
              <p className="mt-3 text-base font-medium">{step.title}</p>
              <p className="mt-2 text-sm text-graphite">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-16 sm:grid-cols-2">
        <FeatureCard
          title="Cited, not guessed"
          body="Every answer quotes the exact clause it came from, plus a link to the source, so you can check it yourself."
        />
        <FeatureCard
          title="Partial matches count"
          body="Eligibility isn't binary. See what you qualify for, what's missing, and why."
        />
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-ink bg-cream-paper px-6 py-16 text-center">
          <h2 className="text-[40px] font-medium leading-[1.25] tracking-[-0.016em]">
            Ready to see what you qualify for?
          </h2>
          <p className="max-w-[640px] text-lg text-graphite">
            No account needed. Takes about two minutes.
          </p>
          <a
            href="/check"
            className="mt-4 rounded-full bg-sunshine-highlight px-6 py-4 text-base font-medium text-ink"
          >
            Check your eligibility
          </a>
        </div>
      </section>

      <footer className="mx-auto max-w-[1200px] px-6 py-10 text-center text-sm text-graphite">
        ScholarLens
      </footer>
    </div>
  );
}
