import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { generatePowChallenge, searchNonces } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const status = (page: Page) => page.getByTestId("pow-status");
const start = (page: Page) => page.getByTestId("pow-start");
const cancel = (page: Page) => page.getByTestId("pow-cancel");

const EASY_SEED = 5;
const EASY_URL = `/playground/proof-of-work?seed=${EASY_SEED}&variant=hash-prefix&difficulty=easy`;

/** A seed whose hard hash-prefix challenge has no solution in the first 150000 nonces, so a run lasts a while. */
function findLongSeed(): number {
  for (let seed = 0; seed <= 60; seed++) {
    const c = generatePowChallenge({ rng: createRng(seed), variantId: "hash-prefix", difficulty: "hard" });
    if (searchNonces(c, 0, 150000) === null) return seed;
  }
  throw new Error("no long-running seed found in 0..60");
}

test("easy hash prefix: nothing runs on load; Start finds the expected nonce", async ({ page }) => {
  const c = generatePowChallenge({ rng: createRng(EASY_SEED), variantId: "hash-prefix", difficulty: "easy" });
  const nonce = searchNonces(c, 0, 5_000_000)!;
  await page.goto(EASY_URL);
  await expect(start(page)).toBeVisible();
  await expect(status(page)).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(cancel(page)).toBeDisabled();
  await start(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed", { timeout: 15000 });
  await expect(metric(page, "nonce")).toHaveText(String(nonce));
  await expect(metric(page, "iterations")).toHaveText((nonce + 1).toLocaleString("en-US"));
  await expect(metric(page, "startCount")).toHaveText("1");
  await expect(metric(page, "cancelCount")).toHaveText("0");
  await expect(page.getByTestId("config-prefix")).toHaveText("00");
  await expect(page.getByTestId("pow-note")).toContainText("does not prove the user is human");
});

test("cancel stops the run, leaves no result, keeps the page responsive and no stale completion", async ({ page }) => {
  test.setTimeout(60000);
  const seed = findLongSeed();
  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await start(page).click();
  await cancel(page).click();
  await expect(status(page)).toHaveAttribute("data-state", "cancelled");
  await expect(status(page)).toHaveText("Cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(status(page)).toHaveAttribute("data-state", "cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  // a second Start and Cancel works the same way
  await start(page).click();
  await cancel(page).click();
  await expect(status(page)).toHaveAttribute("data-state", "cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await page.getByRole("button", { name: "New challenge" }).click(); // still responsive
  await expect(status(page)).toHaveAttribute("data-state", "idle");
});

test("after a cancelled hard run, switching to Easy is a new session that completes", async ({ page }) => {
  test.setTimeout(60000);
  const seed = findLongSeed();
  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await start(page).click();
  await cancel(page).click();
  await expect(status(page)).toHaveAttribute("data-state", "cancelled");
  await page.getByTestId("difficulty-easy").click();
  await expect(status(page)).toHaveAttribute("data-state", "idle");
  await start(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed", { timeout: 15000 });
  await expect(metric(page, "startCount")).toHaveText("1");
  await expect(metric(page, "cancelCount")).toHaveText("0");
});

test("leading-zero-bits variant shows bits in the configuration, not a prefix", async ({ page }) => {
  await page.goto(`/playground/proof-of-work?seed=${EASY_SEED}&variant=leading-zero-bits&difficulty=easy`);
  await start(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed", { timeout: 15000 });
  await expect(page.getByTestId("config-bits")).toHaveText("9");
  await expect(page.getByTestId("config-prefix")).toHaveCount(0);
});

test("New challenge in the middle of a run never lets the old run complete", async ({ page }) => {
  test.setTimeout(60000);
  const seed = findLongSeed();
  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await start(page).click();
  await expect(status(page)).toHaveAttribute("data-state", "running");
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(status(page)).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(2000);
  await expect(status(page)).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("result")).toHaveCount(0);
});

test("privacy: a full run stores and sends nothing, and records only a few button events", async ({ page }) => {
  await page.goto(EASY_URL);
  const assertNoDataLeft = await watchPrivacy(page);
  await start(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed", { timeout: 15000 });
  await page.getByTestId("timeline-marker").first().click();
  const total = Number(/of (\d+)/.exec((await page.getByTestId("event-position").textContent()) ?? "")?.[1]);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(6);
  await assertNoDataLeft();
});
