import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { AUTHOR_NAME, AUTHOR_URL } from "../src/lib/site";

const CORPUS_DIR = join(process.cwd(), "../backend/data/programs");

// Read from the corpus so the test follows the review dates instead of copying them.
const EARLIEST_REVIEWED = readdirSync(CORPUS_DIR)
  .filter((file) => file.endsWith(".md"))
  .map((file) => /^reviewed:\s*(\S+)/m.exec(readFileSync(join(CORPUS_DIR, file), "utf8"))?.[1] ?? "")
  .sort()[0];

const PUBLIC_PAGES = ["/", "/check", "/methodology", "/programs", "/programs/federal-pell-grant"];

const VAGUE_LINK_TEXT = new Set(["learn more", "read more", "click here", "here"]);

async function headingLevels(page: Page): Promise<number[]> {
  return page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((headings) =>
    headings.map((heading) => Number(heading.tagName.slice(1))),
  );
}

function expectNoSkippedLevels(levels: number[]) {
  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  levels.slice(1).forEach((level, index) => {
    expect(level, `heading ${index + 2} jumps from h${levels[index]} to h${level}`).toBeLessThanOrEqual(levels[index] + 1);
  });
}

test("the landing page leads with the checker and Pell Grant queries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/scholarship and grant eligibility checker/i);
  const programsHeading = page.locator("#programs").getByRole("heading", { level: 2 });
  await expect(programsHeading).toContainText("Pell Grant");
  await expect(programsHeading).toContainText(/state grant/i);
});

for (const path of ["/", "/programs"]) {
  test(`${path} shows when the program rules were last reviewed`, async ({ page }) => {
    expect(EARLIEST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.goto(path);
    const note = page.getByText("Program rules last reviewed");
    await expect(note).toBeVisible();
    await expect(note.locator("time")).toHaveAttribute("datetime", EARLIEST_REVIEWED);
  });
}

test("the About section names the author and links their profile", async ({ page }) => {
  await page.goto("/");
  const about = page.locator("#about");
  await expect(about.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(about).toContainText(AUTHOR_NAME);
  await expect(about.locator(`a[href="${AUTHOR_URL}"]`)).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/#about");
});

for (const path of PUBLIC_PAGES) {
  test(`${path} has a trust note, a clean heading outline and descriptive links`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(/not financial advice/i);
    await expect(footer.locator('p a[href="/programs"]')).toBeVisible();

    expectNoSkippedLevels(await headingLevels(page));

    // aria-label overrides the visible text as the accessible name, so check it first.
    const linkNames = await page.getByRole("link").evaluateAll((links) =>
      links.map((link) => (link.getAttribute("aria-label") ?? link.textContent ?? "").trim().toLowerCase()),
    );
    expect(linkNames.filter((name) => VAGUE_LINK_TEXT.has(name))).toEqual([]);
  });
}

test("the 404 page has one h1", async ({ page }) => {
  await page.goto("/no-such-page");
  expect((await headingLevels(page)).filter((level) => level === 1)).toHaveLength(1);
});
