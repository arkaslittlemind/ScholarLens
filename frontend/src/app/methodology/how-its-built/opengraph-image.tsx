import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "How ScholarLens is built, and how its eligibility answers are measured";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    headline: "How ScholarLens is built and measured.",
    support: "An agent with two tools, a grounding check on every answer, and a hand-labeled evaluation set.",
  });
}
