import type { Metadata } from "next";

// The one place the production hostname lives. The old scholar-lens-kappa.vercel.app
// host now 308s here (next.config.ts), so search engines carry its history over.
export const SITE_URL = "https://scholarlens.arkaslittlemind.com";

// One token per Search Console URL-prefix property. The old vercel.app token can go
// once that property's Change of Address to the custom domain completes.
const OLD_VERCEL_PROPERTY_TOKEN = "Y1G3d4WXB0oYTFD_5C336PP4zDh57hXcEwTAYdEw6ZA";
const CUSTOM_DOMAIN_PROPERTY_TOKEN = "bN_W5N96kGp3-O5Alk4bTMg1OdG7hhYiREZvDDU4U6g";
export const GOOGLE_SITE_VERIFICATION = [OLD_VERCEL_PROPERTY_TOKEN, CUSTOM_DOMAIN_PROPERTY_TOKEN];

export const SITE_NAME = "ScholarLens";

export const HOME_TITLE = "Scholarship and grant eligibility checker";

export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

export const HOME_FULL_TITLE = TITLE_TEMPLATE.replace("%s", HOME_TITLE);

export const HOME_DESCRIPTION =
  "Describe your situation and see which scholarships and grants you qualify for, from the Pell Grant to state aid, with the exact program rule quoted.";

export const CHECK_DESCRIPTION =
  "Tell us your state, income, GPA and year in school, and we will check your situation against federal and state aid rules and show the rule behind each result.";

export const AUTHOR_NAME = "Arkadipta Mojumder";

export const AUTHOR_URL = "https://github.com/arkaslittlemind";

export const OPEN_GRAPH_DEFAULTS = {
  siteName: SITE_NAME,
  type: "website",
  locale: "en_US",
} as const;

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
}

// Next.js replaces a parent's openGraph object instead of merging it, so a page
// that sets any OG field has to restate the shared defaults.
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: path },
  };
}
