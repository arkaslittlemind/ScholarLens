import { expect, test, type Request } from "@playwright/test";
import type { EligibilityResult } from "../src/lib/eligibility";

const DESCRIPTION =
  "I'm a U.S. citizen starting my first year as an undergraduate. My household income is around $40,000.";

const CITED_RESULT: EligibilityResult = {
  status: "eligible",
  summary: "You meet the Pell Grant's financial need and enrollment rules.",
  reasons: [],
  next_steps: [],
  alternatives: [],
  supporting_clause: "Must be an undergraduate student who has not earned a bachelor's degree.",
  source: {
    program: "Federal Pell Grant",
    document: "Eligibility summary",
    url: "https://studentaid.gov/understand-aid/types/grants/pell",
  },
  missing_info: [],
  tool_trace: ["searching program rules", "validating eligibility", "preparing cited answer"],
};

test("a student checks eligibility and reads a cited verdict", async ({ page }) => {
  const requests: Request[] = [];
  // Held open by the test, so the loading state is asserted without timing guesses.
  let releaseResponse: () => void = () => {};
  const responseReleased = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  await page.route("**/eligibility", async (route) => {
    requests.push(route.request());
    await responseReleased;
    await route.fulfill({ status: 200, json: CITED_RESULT });
  });

  await page.goto("/check");
  await expect(page.getByRole("heading", { name: "Check your eligibility" })).toBeVisible();

  await page.getByLabel("Describe your situation").fill(`  ${DESCRIPTION}  `);
  await page.getByLabel("State (optional)").fill("New Jersey");
  await page.getByLabel("GPA (optional)").fill("3.6");
  await page.getByRole("button", { name: "Check eligibility" }).click();

  const pendingButton = page.getByRole("button", { name: "Checking eligibility..." });
  await expect(pendingButton).toBeDisabled();
  const activity = page.getByRole("status");
  await expect(activity.getByText("Searching program rules")).toBeVisible();

  expect(requests).toHaveLength(1);
  expect(requests[0].method()).toBe("POST");
  // The dead address from playwright.config.ts, so an unstubbed call could never reach a backend.
  expect(requests[0].url()).toBe("http://127.0.0.1:9/eligibility");
  // Blank optional fields are omitted and numbers stay numbers, as the backend expects.
  expect(requests[0].postDataJSON()).toEqual({
    description: DESCRIPTION,
    state: "New Jersey",
    gpa: 3.6,
  });

  releaseResponse();

  await expect(page.getByText("Eligible", { exact: true })).toBeVisible();
  await expect(page.getByText(CITED_RESULT.summary)).toBeVisible();
  await expect(page.locator("blockquote")).toHaveText(`“${CITED_RESULT.supporting_clause}”`);
  await expect(page.getByRole("heading", { level: 2, name: "Federal Pell Grant" })).toBeVisible();
  // The heading already names the program and the rule's caption the document,
  // so the Source section adds only the link.
  await expect(page.locator("figcaption")).toHaveText("Eligibility summary");
  const source = page.getByRole("region", { name: "Source" });
  await expect(source.getByText("Federal Pell Grant", { exact: true })).toHaveCount(0);
  await expect(source.getByText("Eligibility summary", { exact: true })).toHaveCount(0);
  await expect(
    source.getByRole("link", { name: "Open source on studentaid.gov (opens in a new tab)" }),
  ).toHaveAttribute("href", CITED_RESULT.source!.url);

  await expect(activity).toHaveCount(0);
  // Next.js adds an empty role="alert" route announcer to every page; only a message counts.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check eligibility" })).toBeEnabled();
  expect(requests).toHaveLength(1);
});

test("a busy engine tells the student when to try again", async ({ page }) => {
  const requests: Request[] = [];
  await page.route("**/eligibility", async (route) => {
    requests.push(route.request());
    await route.fulfill({
      status: 503,
      // Mirrors the backend's CORS response: without the expose header, the browser hides
      // Retry-After from the page and the message loses its wait time.
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3100",
        "Access-Control-Expose-Headers": "Retry-After",
        "Retry-After": "20",
      },
      json: {
        error: {
          code: "engine_busy",
          message: "The eligibility engine is busy. Please try again shortly.",
          fields: [],
        },
      },
    });
  });

  await page.goto("/check");
  await page.getByLabel("Describe your situation").fill(DESCRIPTION);
  await page.getByRole("button", { name: "Check eligibility" }).click();

  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "The eligibility engine is busy right now. Please try again in about a minute.",
  );
  await expect(page.getByRole("button", { name: "Check eligibility" })).toBeEnabled();
  await expect(page.getByText("Eligible", { exact: true })).toHaveCount(0);
  // A 503 the server answered is never auto-retried; only transport failures are.
  expect(requests).toHaveLength(1);
});
