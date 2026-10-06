import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "ScholarLens: see which scholarships you qualify for, with the rule behind each answer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    headline: "See which scholarships you qualify for, and why.",
    support: "Describe your situation and ScholarLens checks it against the official rules for each program.",
  });
}
