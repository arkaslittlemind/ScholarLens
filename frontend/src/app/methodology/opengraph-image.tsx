import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "How ScholarLens checks official program rules and cites every answer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    headline: "How ScholarLens reaches an answer.",
    support: "It reads the official program rules first and never says yes without quoting one.",
  });
}
