import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { COVERED_PROGRAMS, programPath } from "../src/lib/programs";

const SITE_URL = "https://scholar-lens-kappa.vercel.app";

// Read from the corpus so the test follows the rule text instead of copying it.
const PELL_ENROLLMENT_RULE = readFileSync(join(process.cwd(), "../backend/data/programs/federal_pell_grant.md"), "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("- Must be enrolled"))
  ?.slice(2);

async function breadcrumbTrail(page: Page) {
  const body = (await page.locator('script[type="application/ld+json"]').textContent()) ?? "";
  const graph = (JSON.parse(body) as { "@graph": { "@type": string; itemListElement: { name: string; item: string }[] }[] })[
    "@graph"
  ];
  expect(graph.map((node) => node["@type"])).toEqual(["BreadcrumbList"]);
  return graph[0].itemListElement.map(({ name, item }) => ({ name, item }));
}

test("/programs links every covered program to its page", async ({ page }) => {
  await page.goto("/programs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eligibility requirements for every program ScholarLens covers");
  const main = page.getByRole("main");
  for (const program of COVERED_PROGRAMS) {
    await expect(main.getByRole("link", { name: program.name, exact: true })).toHaveAttribute("href", programPath(program.slug));
  }
  expect(await breadcrumbTrail(page)).toEqual([
    { name: "Home", item: SITE_URL },
    { name: "Programs", item: `${SITE_URL}/programs` },
  ]);
});

test("a program page shows the corpus rules, the review date and the official source", async ({ page }) => {
  expect(PELL_ENROLLMENT_RULE).toBeTruthy();
  await page.goto("/programs/federal-pell-grant");
  const main = page.getByRole("main");

  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Federal Pell Grant eligibility requirements");
  await expect(main.getByText("Rules last reviewed September 21, 2026")).toBeVisible();
  await expect(main.locator("time")).toHaveAttribute("datetime", "2026-09-21");
  await expect(main.getByText(PELL_ENROLLMENT_RULE ?? "", { exact: true })).toBeVisible();

  const source = main.getByRole("link", { name: /Read the official rules on studentaid\.gov/ });
  await expect(source).toHaveAttribute("href", "https://studentaid.gov/understand-aid/types/grants/pell");
  await expect(source).toHaveAttribute("target", "_blank");
  await expect(source).toHaveAttribute("rel", "noopener noreferrer");

  await expect(main.getByRole("link", { name: "how ScholarLens checks your situation against these rules" })).toHaveAttribute(
    "href",
    "/methodology",
  );
  await expect(main.getByRole("link", { name: "Check your eligibility" })).toHaveAttribute("href", "/check");

  expect(await breadcrumbTrail(page)).toEqual([
    { name: "Home", item: SITE_URL },
    { name: "Programs", item: `${SITE_URL}/programs` },
    { name: "Federal Pell Grant", item: `${SITE_URL}/programs/federal-pell-grant` },
  ]);
});

test("an unknown program is a 404", async ({ page }) => {
  const response = await page.goto("/programs/no-such-program");
  expect(response?.status()).toBe(404);
});

test("every program page has its own title, canonical URL and description", async ({ page }) => {
  const descriptions = new Set<string>();
  for (const program of COVERED_PROGRAMS) {
    await page.goto(programPath(program.slug));
    await expect(page).toHaveTitle(`${program.name} eligibility requirements | ScholarLens`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}${programPath(program.slug)}`);
    descriptions.add((await page.locator('meta[name="description"]').getAttribute("content")) ?? "");
  }
  expect(descriptions.size).toBe(COVERED_PROGRAMS.length);
});

test("the landing page links each program once, grouped as federal and state", async ({ page }) => {
  await page.goto("/");
  const programs = page.locator("#programs");
  const links = programs.getByRole("link");
  await expect(links).toHaveCount(COVERED_PROGRAMS.length);
  for (const program of COVERED_PROGRAMS) {
    await expect(programs.locator(`a[href="${programPath(program.slug)}"]`)).toHaveCount(1);
  }
  await expect(programs.getByRole("heading", { name: "Federal grants (3)" })).toBeVisible();
  await expect(programs.getByRole("heading", { name: "State programs (7)" })).toBeVisible();
});
