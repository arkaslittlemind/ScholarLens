import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "ScholarLens eligibility checker: describe your situation and get a cited answer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    headline: "Check your scholarship and grant eligibility",
    support: "Describe your situation in plain words and get a cited answer in about a minute.",
  });
}
