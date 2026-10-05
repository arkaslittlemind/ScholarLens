"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

interface NavLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  links: NavLink[];
  pathname: string;
  showCta: boolean;
}

// The trigger's icons share one grid cell and crossfade, like the submit button's labels.
function iconLayerClass(active: boolean): string {
  return `col-start-1 row-start-1 size-5 transition-[opacity,scale] duration-150 ease-out-strong motion-reduce:scale-100! ${
    active ? "scale-100 opacity-100" : "scale-75 opacity-0"
  }`;
}

// Below md the header has no room for the nav, so it lives in a panel that drops out
// of the header. Radix supplies the focus trap, Escape, scroll lock and aria-modal;
// Motion's AnimatePresence keeps the open/close interruptible mid-flight.
export function MobileMenu({ links, pathname, showCta }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const close = () => setOpen(false);

  // If the window widens past md while open (a tablet rotating), the panel hides
  // itself; close the dialog too, or the page would stay inert behind it.
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 48rem)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className="-mr-2 grid size-11 place-items-center rounded-lg text-ink transition-press hover:bg-tint active:scale-[0.97] md:hidden"
        >
          <Menu aria-hidden="true" className={iconLayerClass(!open)} />
          <X aria-hidden="true" className={iconLayerClass(open)} />
        </button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          // AnimatePresence needs a keyed child: without one, reopening during an exit
          // remounts the panel mid-tap and a link press never becomes a click.
          <Dialog.Portal forceMount key="mobile-menu">
            {/* Starts below the header, so the header and its close button stay readable. */}
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-x-0 top-16 bottom-0 z-30 bg-ink/20 sm:top-18 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // Radix skips links when choosing what to focus, which would start keyboard
              // users on the close button below the list. Start on the first link instead.
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                navRef.current?.querySelector("a")?.focus();
              }}
            >
              {/* Solid paper, not translucent: it sits against the translucent header,
                  and stacked translucency loses legibility. Enters and leaves along the
                  same path, out of the header; a critically damped spring in, a quicker
                  tween out. */}
              <motion.div
                className="fixed inset-x-0 top-16 z-40 origin-top rounded-b-2xl border-b border-hairline bg-paper px-4 pb-6 shadow-lift outline-none motion-reduce:transform-none! sm:top-18 sm:px-6 md:hidden"
                initial={{ opacity: 0, transform: "translateY(-8px) scale(0.98)" }}
                animate={{
                  opacity: 1,
                  transform: "translateY(0px) scale(1)",
                  transition: { type: "spring", duration: 0.35, bounce: 0 },
                }}
                exit={{
                  opacity: 0,
                  transform: "translateY(-8px) scale(0.98)",
                  transition: { duration: 0.15, ease: EASE_OUT },
                }}
              >
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <nav ref={navRef} aria-label="Main" className="flex flex-col">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className="flex min-h-14 items-center justify-between border-b border-hairline font-display text-title-sm text-ink-secondary transition-colors duration-150 aria-[current=page]:text-ink"
                    >
                      {link.label}
                      <ArrowRight aria-hidden="true" className="size-4 text-ink-secondary/60" />
                    </Link>
                  ))}
                </nav>
                {showCta && (
                  <Button asChild size="lg" className="mt-6 w-full">
                    <Link href="/check" onClick={close}>
                      Check your eligibility
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                {/* While open, Radix hides the header (and its X) from assistive tech, and
                    VoiceOver on iOS has no Escape key, so the panel carries its own close.
                    Hidden for sighted users, who have the X, and shown on keyboard focus.
                    Last in the panel on purpose: appearing or collapsing here never shifts
                    a link mid-tap (at the top it moved every link up as focus left it). */}
                <Dialog.Close className="sr-only focus-visible:not-sr-only focus-visible:mt-4 focus-visible:inline-flex focus-visible:rounded-full focus-visible:bg-tint focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-caption focus-visible:font-semibold focus-visible:text-ink">
                  Close menu
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
