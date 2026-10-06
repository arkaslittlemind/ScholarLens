import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Fixed dates, not the build time: Google stops trusting lastmod when it changes on
// every deploy. Bump a route's date when that page's content actually changes.
const ROUTES = [
  { path: "", lastModified: "2026-10-07" },
  { path: "/check", lastModified: "2026-10-07" },
  { path: "/methodology", lastModified: "2026-10-07" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, lastModified }) => ({ url: `${SITE_URL}${path}`, lastModified }));
}
