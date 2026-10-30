import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";

const SEED = 52;
const metric = (page: import("@playwright/test").Page, id: string) => page.getByTestId(`metric-${id}`);

test("Browser Capability: nothing runs on load; Run checks passes with boolean results and no data leaves", async ({ page }) => {
  await page.goto(`/playground/browser-capability?seed=${SEED}&variant=basic&difficulty=easy`);
  await expect(page.getByTestId("bc-checks")).toHaveCount(0);
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  const assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  for (const id of ["javascript", "compute", "webcrypto", "canvas"]) {
    await expect(page.getByTestId(`bc-check-${id}`)).toHaveAttribute("data-available", "true");
  }
  await expect(page.getByTestId("bc-check-worker")).toHaveCount(0); // Basic does not ask for it
  await expect(metric(page, "checkCount")).toHaveText("4");
  await expect(metric(page, "supportedCount")).toHaveText("4");
  await expect(metric(page, "attemptCount")).toHaveText("1");
  // Booleans and counts only: no duration of any kind is measured or shown.
  for (const id of ["probeTime", "computeTime", "fillTime", "reactionTime"]) await expect(metric(page, id)).toHaveCount(0);
  await expect(page.getByTestId("inspect")).not.toContainText(/\d\s?ms/);
  await expect(page.getByTestId("bc-privacy")).toContainText("not a device fingerprint");
  await expect(page.getByTestId("computation-disclaimer")).toContainText("does not prove a human user");
  await expect(page.getByTestId("bc-run")).toBeDisabled();
  await assertNoDataLeft();
});

test("Browser Capability: Extended asks for 7 checks, and an unavailable API fails the whole and is named", async ({ page }) => {
  await page.addInitScript(() => {
    // Stand-in for an environment without Web Workers.
    Object.defineProperty(window, "Worker", { value: undefined, configurable: true });
  });
  await page.goto(`/playground/browser-capability?seed=${SEED}&variant=extended&difficulty=easy`);
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await expect(page.getByTestId("bc-check-worker")).toHaveAttribute("data-available", "false");
  await expect(page.getByTestId("bc-check-webcrypto")).toHaveAttribute("data-available", "true");
  await expect(page.getByTestId("bc-checks").locator("li")).toHaveCount(7);
  await expect(metric(page, "supportedCount")).toHaveText("6");
});

test("Browser Capability: New challenge starts clean", async ({ page }) => {
  await page.goto(`/playground/browser-capability?seed=${SEED}`);
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.getByTestId("bc-new").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("bc-run")).toBeEnabled();
});

test("Invisible Lab: nothing is recorded before Start; a keyboard run is classified and only suggests a next demo", async ({ page }) => {
  await page.goto("/playground/invisible");
  await expect(page.getByTestId("invisible-scope")).toContainText("Nothing is recorded before you press Start");
  await expect(page.getByTestId("invisible-pad")).toHaveCount(0);
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
  await page.getByTestId("invisible-start").focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId("invisible-target")).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  await expect(page.getByTestId("invisible-pad")).toHaveCount(0); // recording ended with the run
  await expect(page.getByText("Experimental escalation suggestion")).toBeVisible();
  await expect(page.getByTestId("escalation-note")).toContainText("Nothing is blocked, redirected or restricted");
  await expect(page).toHaveURL(/\/playground\/invisible/);
  await page.getByTestId("invisible-reset").click();
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
});

test("Invisible Lab: Stop discards the run and the pad disappears", async ({ page }) => {
  await page.goto("/playground/invisible");
  await page.getByTestId("invisible-start").click();
  await expect(page.getByTestId("invisible-pad")).toBeVisible();
  await page.getByTestId("invisible-cancel").click();
  await expect(page.getByTestId("invisible-pad")).toHaveCount(0);
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
});

test("Adaptive Lab: nothing before a choice; each profile shows the suggestion for its classifier label; no redirect", async ({ page }) => {
  await page.goto("/playground/adaptive");
  await expect(page.getByTestId("adaptive-result")).toHaveCount(0);
  await expect(page.getByTestId("adaptive-scope")).toContainText("adds no rule");
  const expected: Record<string, [string, RegExp | null]> = {
    "human-like": ["none", null],
    uncertain: ["checkbox", /playground\/checkbox/],
    "synthetic-like": ["slider", /playground\/slider/],
  };
  const seen = new Set<string>();
  for (const profile of ["regular", "eased", "mixed", "variable"]) {
    await page.getByTestId(`adaptive-profile-${profile}`).click();
    const el = page.getByTestId("adaptive-escalation");
    const label = (await el.getAttribute("data-label")) ?? "";
    const [key, href] = expected[label] ?? ["?", null];
    seen.add(label);
    await expect(el).toHaveAttribute("data-escalation", key);
    if (href) await expect(page.getByTestId("adaptive-escalation-link")).toHaveAttribute("href", href);
    else await expect(page.getByTestId("adaptive-escalation-link")).toHaveCount(0);
    await expect(page).toHaveURL(/\/playground\/adaptive/); // a suggestion never navigates
  }
  expect(seen.size).toBeGreaterThan(0);
  for (const l of Object.keys(expected)) await expect(page.getByTestId(`adaptive-row-${l}`)).toBeVisible();
});
