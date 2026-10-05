"use client";

import { ArrowRight } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#programs", label: "Programs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // The hairline only appears once content passes underneath, so the header
  // reads as part of the page at rest and as a bar while scrolling.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent bg-paper/85 backdrop-blur-md transition-[border-color] duration-200 data-[scrolled=true]:border-hairline"
    >
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-6 px-4 sm:h-[72px] sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm text-[15px] font-semibold text-ink-secondary transition-colors duration-150 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm" className="h-9 px-3.5 sm:px-4">
          <Link href="/check">
            Check eligibility
            <ArrowRight aria-hidden="true" className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
