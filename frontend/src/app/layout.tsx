import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import {
  HOME_DESCRIPTION,
  HOME_FULL_TITLE,
  HOME_TITLE,
  OPEN_GRAPH_DEFAULTS,
  SITE_NAME,
  SITE_URL,
  TITLE_TEMPLATE,
} from "@/lib/site";
import "./globals.css";
import { Providers } from "./providers";

// Two-family system per project-requirement-docs/design.md: a soft book serif
// for display headings, a clean grotesque for everything else.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: TITLE_TEMPLATE, default: HOME_FULL_TITLE },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...OPEN_GRAPH_DEFAULTS, title: HOME_TITLE },
  twitter: { card: "summary_large_image" },
};

// Mobile browser chrome blends into the white header instead of a default grey bar.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Smooth scrolling is for in-page anchors. This tells Next.js 16 to switch it off
      // during route changes, so a new page starts at the top instead of animating there.
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
