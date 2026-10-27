"use client";

import { ArrowRight } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#programs", label: "Programs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // The hairline only appears once content passes underneath, so the header
  // reads as part of the page at rest and as a bar while scrolling.
  // On the landing page the hero carries the brown primary, so the header's copy of the
  // action stays outlined until the hero has scrolled away: one primary per view.
  const [pastHero, setPastHero] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 8);
    setPastHero(y > 480);
  });
  const ctaVariant = pathname === "/" && !pastHero ? "outline" : "default";

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent bg-paper/85 backdrop-blur-md transition-[border-color] duration-200 data-[scrolled=true]:border-hairline reduce-transparency:bg-paper reduce-transparency:backdrop-blur-none"
    >
      {/* From md, three columns keep the nav centered whether or not the right-hand
          button is shown. Below md the nav is hidden, so two columns: the logo's can
          shrink, which keeps the menu button on screen when the reader's text size is large. */}
      <div className="mx-auto grid h-16 max-w-280 grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-4 sm:h-18 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="col-start-1 min-w-0 max-w-full justify-self-start">
          <Logo />
        </div>
        <nav aria-label="Main" className="col-start-2 hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="rounded-sm text-body-sm font-semibold text-ink-secondary transition-colors duration-150 hover:text-ink aria-[current=page]:text-ink pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="col-start-2 flex items-center gap-2 justify-self-end md:col-start-3">
          {/* On /check this would link to the page you're already on. Below sm it
              moves into the menu: logo, button and menu don't fit one phone row. */}
          {pathname !== "/check" && (
            <Button asChild size="sm" variant={ctaVariant} className="hidden h-9 px-4 whitespace-nowrap sm:inline-flex pointer-coarse:h-11">
              <Link href="/check">
                Check your eligibility
                <ArrowRight aria-hidden="true" className="transition-transform duration-150 motion-safe:pointer-fine:group-hover/button:translate-x-0.5" />
              </Link>
            </Button>
          )}
          <MobileMenu links={NAV_LINKS} pathname={pathname} showCta={pathname !== "/check"} />
        </div>
      </div>
    </header>
  );
}
