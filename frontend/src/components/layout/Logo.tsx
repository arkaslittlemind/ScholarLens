import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-md text-ink">
      <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7">
        <circle cx="12" cy="12" r="8.5" fill="var(--color-rust-tint)" stroke="var(--color-brown)" strokeWidth="2.2" />
        <path d="M8.5 12.5l2.4 2.4 4.6-5" fill="none" stroke="var(--color-rust)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.4 18.4l6 6" stroke="var(--color-brown)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[22px] leading-none">ScholarLens</span>
    </Link>
  );
}
