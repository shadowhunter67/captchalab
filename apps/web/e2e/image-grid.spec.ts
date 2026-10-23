import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { expectedSelection, registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 17;
const URL = `/playground/image-grid?seed=${SEED}`;
const challenge = registry.get("image-grid").generate({ rng: createRng(SEED) });
const good = expectedSelection(challenge);
const wrong = challenge.cells.find((c) => !good.includes(c.id))!.id;
const cell = (page: Page, id: string) => page.getByTestId(`cell-${id}`);
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("image-grid")).toBeVisible();
});

test("selecting exactly the matching images passes; metrics are shown", async ({ page }) => {
  for (const id of good) await cell(page, id).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "selectionCount")).toHaveText(String(good.length));
  await expect(metric(page, "correctionCount")).toHaveText("0");
  await expect(metric(page, "attemptCount")).toHaveText("1");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
  await expect(metric(page, "interClickTimeMean")).toHaveText(/ms$/);
});

test("a wrong tile is Not passed; deselecting it counts a correction; changing selection clears the result", async ({ page }) => {
  for (const id of good) await cell(page, id).click();
  await cell(page, wrong).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await cell(page, wrong).click();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctionCount")).toHaveText("1");
});

test("a missing tile is Not passed", async ({ page }) => {
  for (const id of good.slice(1)) await cell(page, id).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
});

test("keyboard: arrows move focus, Space and Enter toggle", async ({ page }) => {
  const ids = challenge.cells.map((c) => c.id);
  await cell(page, "c1").focus();
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    await expect(cell(page, ids[i]!)).toBeFocused();
    if (good.includes(ids[i]!)) await page.keyboard.press(n++ % 2 === 0 ? "Space" : "Enter");
    if (i < ids.length - 1) await page.keyboard.press("ArrowRight");
    if (i % 3 === 2 && i < ids.length - 1) {
      // ArrowRight stopped at the row edge; step down and back to the first column
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowLeft");
    }
  }
  await page.getByTestId("verify").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
});

test("privacy: no raw data leaves the page and tiles are labelled toggle buttons", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await expect(cell(page, "c1")).toHaveAttribute("aria-label", /^Image 1 of 9: /);
  await expect(cell(page, "c1")).toHaveAttribute("aria-pressed", "false");
  for (const id of good) await cell(page, id).click();
  await expect(cell(page, good[0]!)).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await assertNoDataLeft();
});

test("New challenge clears selection, result and recording", async ({ page }) => {
  await cell(page, "c1").click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(cell(page, "c1")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("learn")).toContainText("does not claim to reproduce the complete");
});
