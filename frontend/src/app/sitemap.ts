import type { MetadataRoute } from "next";
import { getPrograms } from "@/lib/corpus";
import { programPath } from "@/lib/programs";
import { SITE_URL } from "@/lib/site";

// Fixed dates, not the build time: Google stops trusting lastmod when it changes on
// every deploy. Bump a route's date when that page's content actually changes.
const ROUTES = [
  { path: "", lastModified: "2026-10-07" },
  { path: "/check", lastModified: "2026-10-07" },
  { path: "/methodology", lastModified: "2026-10-27" },
  { path: "/methodology/how-its-built", lastModified: "2026-10-27" },
  { path: "/programs", lastModified: "2026-10-07" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // A program page changes when its rules are re-reviewed, so its review date is its lastmod.
  const programs = getPrograms().map((program) => ({
    path: programPath(program.slug),
    lastModified: program.reviewed,
  }));
  return [...ROUTES, ...programs].map(({ path, lastModified }) => ({ url: `${SITE_URL}${path}`, lastModified }));
}
