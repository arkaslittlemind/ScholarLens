import { expect, test, type Page } from "@playwright/test";
import type { EligibilityResult } from "../src/lib/eligibility";

const DESCRIPTION = "I'm a first-year undergraduate and a U.S. citizen.";

const RESULT: EligibilityResult = {
  status: "eligible",
  summary: "You meet the Pell Grant's enrollment rules.",
  reasons: ["You are an undergraduate without a bachelor's degree, which the rule requires."],
  next_steps: ["Submit the FAFSA."],
  alternatives: [
    {
      program: "Federal SEOG",
      why_it_may_fit: "Pell Grant recipients with exceptional need get priority.",
      source_url: "https://studentaid.gov/understand-aid/types/grants/fseog",
    },
  ],
  supporting_clause: "Must be an undergraduate student who has not earned a bachelor's degree.",
  source: {
    program: "Federal Pell Grant",
    document: "Eligibility summary",
    url: "https://studentaid.gov/understand-aid/types/grants/pell",
  },
  missing_info: [],
  tool_trace: ["searching program rules", "validating eligibility", "preparing cited answer"],
};

async function stubResult(page: Page, result: EligibilityResult) {
  await page.route("**/eligibility", (route) => route.fulfill({ status: 200, json: result }));
}

test("a failed submit moves focus to the first invalid field", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Check eligibility" }).click();

  const description = page.getByLabel("Describe your situation");
  await expect(description).toBeFocused();
  await expect(page.getByText("Describe your situation in 1-2000 characters.")).toBeVisible();

  await description.fill(DESCRIPTION);
  await page.getByLabel("GPA (optional)").fill("-1");
  await page.getByRole("button", { name: "Check eligibility" }).click();

  await expect(page.getByLabel("GPA (optional)")).toBeFocused();
});

test("a finished check is announced to screen readers", async ({ page }) => {
  await stubResult(page, RESULT);
  await page.goto("/check");

  const announcement = page.getByTestId("result-announcement");
  await expect(announcement).toHaveText("");

  await page.getByLabel("Describe your situation").fill(DESCRIPTION);
  await page.getByRole("button", { name: "Check eligibility" }).click();

  await expect(announcement).toHaveText("Result ready: Eligible.");
  await expect(announcement).toHaveAttribute("aria-live", "polite");
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("a long source URL and clause do not cause horizontal scroll", async ({ page }) => {
    await stubResult(page, {
      ...RESULT,
      supporting_clause: `Applicants must meet ${"x".repeat(160)} before the award is made.`,
      source: {
        program: "Federal Pell Grant",
        document: "Eligibility summary",
        // Not http(s), so VerdictCard renders it as inert text rather than a link.
        url: `ftp://${"a".repeat(194)}`,
      },
    });
    await page.goto("/check");
    await page.getByLabel("Describe your situation").fill(DESCRIPTION);
    await page.getByRole("button", { name: "Check eligibility" }).click();
    await expect(page.getByText("Eligible", { exact: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
