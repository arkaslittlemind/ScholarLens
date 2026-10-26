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
    summary: "Your enrollment status decides this.",
    reasons: [],
    next_steps: [],
    alternatives: [],
    supporting_clause: null,
    source: null,
    missing_info: ["Your enrollment status"],
    tool_trace: [],
  });

  await expect(page.getByRole("heading", { level: 2, name: "Your result" })).toBeVisible();
  await expect(page.getByText("Partial match", { exact: true })).toBeVisible();
  await expect(
    page.getByText("There's no rule to quote yet, because the answer depends on details you haven't shared."),
  ).toBeVisible();
  await expect(page.getByText("No source document was cited for this result.")).toBeVisible();
  await expect(page.getByText("This result may change with more information:")).toBeVisible();
  await expect(
    page.getByText("ScholarLens checks eligibility rules, not your chances of an award.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("How this answer was found")).toHaveCount(0);

  // The missing details lead back to the description, with what was written kept.
  await page.getByRole("button", { name: "Add these details and check again" }).click();
  const description = page.getByLabel("Describe your situation");
  await expect(description).toBeFocused();
  await expect(description).toHaveValue(DESCRIPTION);
});

const CITED_PELL: EligibilityResult = {
  status: "eligible",
  summary: "You meet the Pell Grant's enrollment rules.",
  reasons: [],
  next_steps: [],
  alternatives: [],
  supporting_clause: "Must be enrolled in an eligible undergraduate program.",
  source: {
    program: "Federal Pell Grant",
    document: "Eligibility summary",
    url: "https://studentaid.gov/understand-aid/types/grants/pell",
  },
  missing_info: [],
  tool_trace: ["searching program rules", "validating eligibility", "preparing cited answer"],
};

test("a result says whether its rule came from a reviewed program or the web", async ({ page }) => {
  await checkWith(page, { ...CITED_PELL, source_origin: "knowledge_base" });
  await expect(page.getByText("From the program rules we've reviewed.")).toBeVisible();

  await expect(page.getByRole("heading", { level: 3, name: "The rule", exact: true })).toBeVisible();

  await checkWith(page, { ...CITED_PELL, source_origin: "web" });
  await expect(page.getByText("Found on the web.", { exact: false })).toBeVisible();
  await expect(page.getByText("From the program rules we've reviewed.")).toHaveCount(0);
  // The unreviewed status sits on the quote itself, not only under the heading.
  await expect(
    page.getByRole("heading", { level: 3, name: "The rule, as published on studentaid.gov" }),
  ).toBeVisible();
  await expect(page.locator("figcaption")).toContainText("Not reviewed by ScholarLens.");
});

test("on a phone the reviewed-program scope shows before the form", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/check");
  const note = page.getByText("We've reviewed 10 US programs in detail.", { exact: false });
  await expect(note).toBeVisible();
  const noteTop = (await note.boundingBox())!.y;
  const formTop = (await page.locator("form").boundingBox())!.y;
  expect(noteTop).toBeLessThan(formTop);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(note).toBeHidden();
});

test("a result with no confirmed origin claims neither", async ({ page }) => {
  await checkWith(page, CITED_PELL);
  await expect(page.getByText("Found on the web.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("From the program rules we've reviewed.")).toHaveCount(0);
});

test("a slow check says why it is taking longer", async ({ page }) => {
  await page.clock.install();
  // Never answered, so the check stays in flight while the clock moves.
  await page.route("**/eligibility", () => {});
  await page.goto("/check");
  await page.getByLabel("Describe your situation").fill(DESCRIPTION);
  await page.getByRole("button", { name: "Check eligibility" }).click();

  await expect(page.getByText("This usually takes a few seconds.")).toBeVisible();
  await page.clock.fastForward(13_000);
  await expect(
    page.getByText("Still working. Checks that search the web can take up to a minute."),
  ).toBeVisible();
});

test("a cited result names its program, rule, source host, and steps", async ({ page }) => {
  await checkWith(page, {
    status: "eligible",
    summary: "You meet the Pell Grant's enrollment rules.",
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

test("with no quoted rule, the Source section names the document", async ({ page }) => {
  await checkWith(page, {
    status: "partial",
    summary: "The rules depend on your enrollment status.",
    reasons: [],
    next_steps: [],
    alternatives: [],
    supporting_clause: null,
    source: {
      program: "Federal Pell Grant",
      document: "Eligibility summary",
      url: "https://studentaid.gov/understand-aid/types/grants/pell",
    },
    missing_info: ["Your enrollment status"],
    tool_trace: ["searching program rules"],
  });

  const source = page.getByRole("region", { name: "Source" });
  await expect(source.getByText("Eligibility summary", { exact: true })).toBeVisible();
  await expect(source.getByText("Federal Pell Grant", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Eligibility summary", { exact: true })).toHaveCount(1);
});

test("a non-http source URL stays inert text", async ({ page }) => {
  const url = "ftp://files.example.org/pell.pdf";
  await checkWith(page, {
    status: "not_eligible",
    summary: "You already hold a bachelor's degree.",
    reasons: [],
    next_steps: [],
    alternatives: [],
    supporting_clause: "Must not have earned a bachelor's degree.",
    source: { program: "Federal Pell Grant", document: "Eligibility summary", url },
    missing_info: [],
    tool_trace: ["searching program rules"],
  });

  await expect(page.getByText("Not eligible", { exact: true })).toBeVisible();
  await expect(page.getByText(url)).toBeVisible();
  await expect(page.getByRole("link", { name: /Open source/ })).toHaveCount(0);
});

test("a structured result shows its reasons, next steps, and linked alternatives", async ({ page }) => {
  const inertUrl = "javascript:alert(1)";
  await checkWith(page, {
    status: "not_eligible",
    summary: "You already hold a bachelor's degree, so the Pell Grant is out of reach.",
    reasons: ["The Pell Grant is only for students without a bachelor's degree."],
    next_steps: ["Look at graduate fellowships in your field.", "Ask your aid office about loans."],
    alternatives: [
      {
        program: "NSF Graduate Research Fellowship",
        why_it_may_fit: "It funds graduate students in science and engineering.",
        source_url: "https://www.nsfgrfp.org/applicants/",
      },
      {
        program: "Unlinked Award",
        why_it_may_fit: "A link that must not be clickable.",
        source_url: inertUrl,
      },
    ],
    supporting_clause: "Must not have earned a bachelor's degree.",
    source: {
      program: "Federal Pell Grant",
      document: "Eligibility summary",
      url: "https://studentaid.gov/understand-aid/types/grants/pell",
    },
    missing_info: [],
    tool_trace: ["searching program rules"],
  });

  const reasons = page.getByRole("region", { name: "Why" });
  await expect(reasons.getByRole("listitem")).toHaveText([
    "The Pell Grant is only for students without a bachelor's degree.",
  ]);
  const steps = page.getByRole("region", { name: "Next steps" });
  await expect(steps.getByRole("listitem")).toHaveCount(2);
  await expect(steps.locator("ol")).toBeVisible();

  const alternatives = page.getByRole("region", { name: "Other programs to look at" });
  await expect(alternatives.getByText("NSF Graduate Research Fellowship")).toBeVisible();
  const link = alternatives.getByRole("link", { name: /Official page on www\.nsfgrfp\.org/ });
  await expect(link).toHaveAttribute("href", "https://www.nsfgrfp.org/applicants/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(alternatives.getByText(inertUrl)).toBeVisible();
  await expect(alternatives.getByRole("link")).toHaveCount(1);
});

test("empty sections are left out of the card", async ({ page }) => {
  await checkWith(page, {
    status: "eligible",
    summary: "You meet the Pell Grant's enrollment rules.",
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
    tool_trace: ["searching program rules"],
  });

  await expect(page.getByText("You meet the Pell Grant's enrollment rules.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Next steps" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Other programs to look at" })).toHaveCount(0);
});

test("a response in the old shape is treated as unexpected", async ({ page }) => {
  await page.route("**/eligibility", (route) =>
    route.fulfill({
      status: 200,
      json: {
        status: "eligible",
        explanation: "Old shape.",
        supporting_clause: null,
        source: null,
        missing_info: [],
        tool_trace: [],
      },
    }),
  );
  await page.goto("/check");
  await page.getByLabel("Describe your situation").fill(DESCRIPTION);
  await page.getByRole("button", { name: "Check eligibility" }).click();

  await expect(page.getByText("Old shape.")).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
});

const STREAMED: EligibilityResult = {
  status: "eligible",
  summary: "You meet the Pell Grant's enrollment rules because you are a first-year undergraduate.",
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
  tool_trace: ["searching program rules"],
};

test("the summary ends with a chip linking its source", async ({ page }) => {
  await checkWith(page, STREAMED);

  await expect(page.getByText(STREAMED.summary)).toBeVisible();
  const chip = page.getByRole("link", { name: "Source: studentaid.gov (opens in a new tab)" });
  await expect(chip).toHaveAttribute("href", STREAMED.source!.url);
  await expect(chip).toHaveAttribute("target", "_blank");
  await expect(chip).toHaveAttribute("rel", "noopener noreferrer");
});

test("no source chip without an http source", async ({ page }) => {
  await checkWith(page, {
    ...STREAMED,
    source: { ...STREAMED.source!, url: "javascript:alert(1)" },
  });
  await expect(page.getByText(STREAMED.summary)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Source:/ })).toHaveCount(0);
});

test("no source chip when the result has no source", async ({ page }) => {
  await checkWith(page, { ...STREAMED, status: "partial", supporting_clause: null, source: null });
  await expect(page.getByText(STREAMED.summary)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Source:/ })).toHaveCount(0);
});

test("with reduced motion the whole summary shows at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await checkWith(page, STREAMED);

  const summary = page.getByText(STREAMED.summary);
  await expect(summary).toBeVisible();
  const opacities = await summary
    .locator("span")
    .evaluateAll((words) => words.map((word) => getComputedStyle(word).opacity));
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});
