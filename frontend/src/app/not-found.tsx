import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <p className="font-display text-[80px] leading-none text-rust">404</p>
        <h1 className="font-display type-h2">We couldn&apos;t find that page.</h1>
        <p className="max-w-110 text-lg text-ink-secondary">
          The link may be old. The eligibility checker is still right where you left it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/check">Check your eligibility</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
