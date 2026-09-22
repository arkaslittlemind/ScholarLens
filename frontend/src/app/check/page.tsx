import { SiteHeader } from "@/components/layout/SiteHeader";
import { EligibilityChecker } from "@/components/check/EligibilityChecker";

export default function Check() {
  return (
    <div className="min-h-screen bg-cream-paper text-ink">
      <SiteHeader />
      <section className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-medium">Check your eligibility</h1>
          <p className="max-w-[640px] text-lg text-graphite">
            Describe your situation and we&apos;ll tell you which programs you
            may qualify for, with the exact rule behind each result.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[640px]">
          <EligibilityChecker />
        </div>
      </section>
    </div>
  );
}
