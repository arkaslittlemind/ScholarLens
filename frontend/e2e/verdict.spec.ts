import { expect, test, type Page } from "@playwright/test";
import type { EligibilityResult } from "../src/lib/eligibility";

const DESCRIPTION = "I'm a first-year undergraduate and a U.S. citizen.";

async function checkWith(page: Page, result: EligibilityResult) {
  await page.route("**/eligibility", (route) => route.fulfill({ status: 200, json: result }));
  await page.goto("/check");
  await page.getByLabel("Describe your situation").fill(DESCRIPTION);
  await page.getByRole("button", { name: "Check eligibility" }).click();
}

test("a partial result with no rule or source says so explicitly", async ({ page }) => {
  await checkWith(page, {
    status: "partial",
    explanation: "Your enrollment status decides this.",
    supporting_clause: null,
    source: null,
    missing_info: ["Your enrollment status"],
    tool_trace: [],
  });

  await expect(page.getByRole("heading", { level: 2, name: "Your result" })).toBeVisible();
  await expect(page.getByText("Partial match", { exact: true })).toBeVisible();
  await expect(
    page.getByText("No rule was quoted. This result rests on missing information."),
  ).toBeVisible();
  await expect(page.getByText("No source document was cited for this result.")).toBeVisible();
  await expect(page.getByText("This result may change with more information:")).toBeVisible();
  await expect(
    page.getByText("ScholarLens checks eligibility rules, not your chances of an award.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("How this answer was found")).toHaveCount(0);
});

test("a cited result names its program, rule, source host, and steps", async ({ page }) => {
  await checkWith(page, {
    status: "eligible",
    explanation: "You meet the Pell Grant's enrollment rules.",
    supporting_clause: "Must be an undergraduate student who has not earned a bachelor's degree.",
    source: {
      program: "Federal Pell Grant",
      document: "Eligibility summary",
      url: "https://studentaid.gov/understand-aid/types/grants/pell",
    },
    missing_info: [],
    tool_trace: [
      "searching program rules",
      "checking official sources",
      "validating eligibility",
      "preparing cited answer",
    ],
  });

  await expect(page.getByRole("heading", { level: 2, name: "Federal Pell Grant" })).toBeVisible();
  const rule = page.getByRole("figure");
  await expect(rule.getByText("The rule")).toBeVisible();
  await expect(rule.locator("figcaption")).toHaveText("Eligibility summary");
  await expect(
    page.getByRole("link", { name: "Open source on studentaid.gov (opens in a new tab)" }),
  ).toHaveAttribute("href", "https://studentaid.gov/understand-aid/types/grants/pell");

  const steps = page.getByRole("list", { name: "How this answer was found" });
  await expect(steps.getByRole("listitem")).toHaveText([
    "Searching program rules",
    "Checking official sources",
    "Validating eligibility",
    "Preparing cited answer",
  ]);
  // The finished trace is a plain list, not a second live status region.
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a non-http source URL stays inert text", async ({ page }) => {
  const url = "ftp://files.example.org/pell.pdf";
  await checkWith(page, {
    status: "not_eligible",
    explanation: "You already hold a bachelor's degree.",
    supporting_clause: "Must not have earned a bachelor's degree.",
    source: { program: "Federal Pell Grant", document: "Eligibility summary", url },
    missing_info: [],
    tool_trace: ["searching program rules"],
  });

  await expect(page.getByText("Not eligible", { exact: true })).toBeVisible();
  await expect(page.getByText(url)).toBeVisible();
  await expect(page.getByRole("link", { name: /Open source/ })).toHaveCount(0);
});
