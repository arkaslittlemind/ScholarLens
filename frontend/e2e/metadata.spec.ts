import { expect, test } from "@playwright/test";

const SITE_URL = "https://scholar-lens-kappa.vercel.app";

const PAGES = [
  {
    path: "/",
    title: "Scholarship and grant eligibility checker | ScholarLens",
    canonical: SITE_URL,
    imageAlt: "ScholarLens: see which scholarships you qualify for, with the rule behind each answer",
  },
  {
    path: "/check",
    title: "Check your scholarship and grant eligibility | ScholarLens",
    canonical: `${SITE_URL}/check`,
    imageAlt: "ScholarLens eligibility checker: describe your situation and get a cited answer",
  },
  {
    path: "/methodology",
    title: "How the scholarship eligibility checker works | ScholarLens",
    canonical: `${SITE_URL}/methodology`,
    imageAlt: "How ScholarLens checks official program rules and cites every answer",
  },
];

for (const { path, imageAlt } of PAGES) {
  test(`${path} has its own share image`, async ({ page, request }) => {
    await page.goto(path);
    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
    // Dev builds these URLs from the request host; production builds use metadataBase.
    expect(imageUrl).toMatch(new RegExp(`^https?://[^/]+${path === "/" ? "" : path}/opengraph-image`));
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", imageAlt);
    const twitterUrl = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    expect(twitterUrl).toMatch(new RegExp(`^https?://[^/]+${path === "/" ? "" : path}/twitter-image`));
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", imageAlt);

    // The tags point at production; fetch the same paths from the test server.
    for (const url of [imageUrl, twitterUrl]) {
      const { pathname, search } = new URL(url ?? "");
      const response = await request.get(pathname + search);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
  });
}

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
