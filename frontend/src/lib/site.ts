import type { Metadata } from "next";

// The one place the production hostname lives. Moving to a custom domain later
// means changing this line, then adding redirects and re-verifying Search Console.
export const SITE_URL = "https://scholar-lens-kappa.vercel.app";

// Belongs to the Search Console URL-prefix property for SITE_URL; a new domain needs a new token.
export const GOOGLE_SITE_VERIFICATION = "Y1G3d4WXB0oYTFD_5C336PP4zDh57hXcEwTAYdEw6ZA";

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
