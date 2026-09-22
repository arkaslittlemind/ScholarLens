import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

export default function Check() {
  return (
    <div className="min-h-screen bg-cream-paper text-ink">
      <SiteHeader />
      <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-3xl font-medium">Eligibility check - in progress</h1>
        <p className="max-w-[480px] text-lg text-graphite">
          The guided eligibility flow is still being built. Check back soon.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-4">
          <Link href="/">Back to home</Link>
        </Button>
      </section>
    </div>
  );
}
