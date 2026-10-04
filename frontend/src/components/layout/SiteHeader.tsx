import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-8">
      <Link href="/" className="text-lg font-medium">
        ScholarLens
      </Link>
      <Link
        href="/check"
        className="rounded-full border border-ink px-4 py-2 text-sm font-medium"
      >
        Check eligibility
      </Link>
    </header>
  );
}
