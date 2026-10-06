import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_CONTENT_TYPE = "image/png";

// Hex values mirror the tokens in globals.css; Satori cannot read CSS variables.
const PAPER = "#ffffff";
const TINT = "#f7f5f1";
const INK = "#1a1a1a";
const INK_SECONDARY = "#534a39";
const HAIRLINE = "#e6e2da";
const RUST = "#d05d38";
const SAGE = "#8f9c5e";

// A name used in a style that does not match a registered font silently falls back
// to Geist, so both places read these constants.
const DISPLAY_FONT = "Fraunces";
const BODY_FONT = "Instrument Sans";

const FONT_DIR = join(process.cwd(), "assets/fonts");

interface OgImageInput {
  headline: string;
  support: string;
}

// Satori renders this tree to a PNG and only understands style objects, so the
// project's Tailwind-only rule for UI components does not apply here.
function OgCard({ headline, support }: OgImageInput) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: PAPER }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 80px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: SAGE }} />
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 34, color: INK }}>ScholarLens</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 56, maxWidth: 960 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 72, lineHeight: 1.08, color: INK, letterSpacing: -1 }}>
            {headline}
          </div>
          <div style={{ width: 180, height: 8, borderRadius: 4, background: RUST, marginTop: 24 }} />
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: 30,
              lineHeight: 1.4,
              color: INK_SECONDARY,
              marginTop: 32,
              maxWidth: 900,
            }}
          >
            {support}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 88,
          padding: "0 80px",
          background: TINT,
          borderTop: `2px solid ${HAIRLINE}`,
          fontFamily: BODY_FONT,
          fontSize: 26,
          color: INK_SECONDARY,
        }}
      >
        {new URL(SITE_URL).host}
      </div>
    </div>
  );
}

// Images render at build time, so reading the committed fonts from disk keeps the
// build offline-safe. The bundled fallback is Geist, which is off-brand.
export async function renderOgImage(input: OgImageInput) {
  const [display, body] = await Promise.all([
    readFile(join(FONT_DIR, "Fraunces-SoftMedium.ttf")),
    readFile(join(FONT_DIR, "InstrumentSans-Regular.ttf")),
  ]);

  return new ImageResponse(<OgCard {...input} />, {
    ...OG_SIZE,
    fonts: [
      { name: DISPLAY_FONT, data: display, weight: 500, style: "normal" },
      { name: BODY_FONT, data: body, weight: 400, style: "normal" },
    ],
  });
}
