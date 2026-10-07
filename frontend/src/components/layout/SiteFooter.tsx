import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const FOOTER_LINKS = [
  { href: "/check", label: "Check eligibility" },
  { href: "/programs", label: "Programs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#about", label: "About" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-paper">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-ink-secondary">
            ScholarLens is not financial advice. It checks whether you meet the published eligibility
            rules, which can&apos;t tell you whether you will receive an award. Before you apply,
            confirm the details with the program itself, starting from{" "}
            <Link
              href="/programs"
              className="rounded-sm font-semibold text-ink underline decoration-input underline-offset-4 transition-colors hover:decoration-ink"
            >
              the official sources listed for each program
            </Link>
            .
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm text-sm font-semibold text-ink-secondary transition-colors duration-150 hover:text-ink pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
