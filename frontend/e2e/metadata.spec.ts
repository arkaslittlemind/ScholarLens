import { expect, test } from "@playwright/test";

const SITE_URL = "https://scholar-lens-kappa.vercel.app";

const PAGES = [
  { path: "/", title: "Scholarship and grant eligibility checker | ScholarLens", canonical: SITE_URL },
  {
    path: "/check",
    title: "Check your scholarship and grant eligibility | ScholarLens",
    canonical: `${SITE_URL}/check`,
  },
  {
    path: "/methodology",
    title: "How the scholarship eligibility checker works | ScholarLens",
    canonical: `${SITE_URL}/methodology`,
  },
];

for (const { path, title, canonical } of PAGES) {
  test(`${path} has its own title, canonical URL and share tags`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "ScholarLens");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });
}

test("an unknown URL is a noindex 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("/ops is closed to crawlers", async ({ request }) => {
  // The ops proxy answers 401 without credentials and 503 when none are configured.
  const response = await request.get("/ops", { maxRedirects: 0 });
  expect([401, 503]).toContain(response.status());
});

test("robots.txt allows the site, blocks /ops and points to the sitemap", async ({ request }) => {
  const lines = (await (await request.get("/robots.txt")).text()).split("\n").map((line) => line.trim());
  for (const line of ["User-Agent: *", "Allow: /", "Disallow: /ops", `Sitemap: ${SITE_URL}/sitemap.xml`]) {
    expect(lines).toContain(line);
  }
});

test("the sitemap lists the three indexable pages", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  const locs = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(PAGES.map((page) => page.canonical));
  expect(body.match(/<lastmod>2026-10-07<\/lastmod>/g)).toHaveLength(PAGES.length);
});
