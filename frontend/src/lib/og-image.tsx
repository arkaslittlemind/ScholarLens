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

const FONT_DIR = join(process.cwd(), "assets/fonts");

interface OgImageInput {
  headline: string;
  support: string;
}

// Images render at build time, so reading the committed fonts from disk keeps the
// build offline-safe. The bundled fallback is Geist, which is off-brand.
export async function renderOgImage({ headline, support }: OgImageInput) {
  const [fraunces, instrumentSans] = await Promise.all([
    readFile(join(FONT_DIR, "Fraunces-SoftMedium.ttf")),
    readFile(join(FONT_DIR, "InstrumentSans-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: PAPER }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 80px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: SAGE }} />
            <div style={{ fontFamily: "Fraunces", fontSize: 34, color: INK }}>ScholarLens</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56, maxWidth: 960 }}>
            <div style={{ fontFamily: "Fraunces", fontSize: 72, lineHeight: 1.08, color: INK, letterSpacing: -1 }}>
              {headline}
            </div>
            <div style={{ width: 180, height: 8, borderRadius: 4, background: RUST, marginTop: 24 }} />
            <div
              style={{
                fontFamily: "Instrument Sans",
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
            fontFamily: "Instrument Sans",
            fontSize: 26,
            color: INK_SECONDARY,
          }}
        >
          {new URL(SITE_URL).host}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 500, style: "normal" },
        { name: "Instrument Sans", data: instrumentSans, weight: 400, style: "normal" },
      ],
    },
  );
}
