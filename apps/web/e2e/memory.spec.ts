import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 21;
const WAIT = { timeout: 10000 };
const gen = (variantId: string, difficulty: "easy" | "medium" | "hard") => registry.get("memory").generate({ rng: createRng(SEED), variantId, difficulty });
const url = (variant: string, difficulty: string) => `/playground/memory?seed=${SEED}&variant=${variant}&difficulty=${difficulty}`;

const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const option = (page: Page, id: string) => page.getByTestId(`option-${id}`);
const cell = (page: Page, id: string) => page.getByTestId(`cell-${id}`);
const start = (page: Page) => page.getByTestId("mem-start");
const verify = (page: Page) => page.getByTestId("verify");
const waitForRecall = (page: Page) => expect(verify(page)).toBeVisible(WAIT);

const sequenceEasy = gen("sequence", "easy");
if (sequenceEasy.kind !== "sequence") throw new Error("expected a sequence challenge");
const order = [...sequenceEasy.sequence];
const positionMedium = gen("position", "medium");
if (positionMedium.kind !== "position") throw new Error("expected a position challenge");
const targets = [...positionMedium.targets];
const wrongCell = Array.from({ length: positionMedium.size * positionMedium.size }, (_, i) => `c${i + 1}`).find((id) => !targets.includes(id))!;

test("sequence: preview shows the shapes, recall hides them, the right order passes", async ({ page }) => {
  await page.goto(url("sequence", "easy"));
  await expect(start(page)).toBeVisible();
  await expect(page.getByTestId("preview-item-1")).toHaveCount(0);
  await expect(page.locator('[data-testid^="option-"]')).toHaveCount(0);
  await expect(verify(page)).toHaveCount(0);

  await start(page).click();
  await expect(page.getByTestId("mem-preview-status")).toBeVisible();
  for (let n = 1; n <= order.length; n++) await expect(page.getByTestId(`preview-item-${n}`)).toBeVisible();
  await expect(page.locator('[data-testid^="option-"]')).toHaveCount(0);

  await waitForRecall(page);
  await expect(page.locator('[data-testid^="preview-item-"]')).toHaveCount(0);
  await expect(page.getByTestId("mem-preview-status")).toHaveCount(0);
  await expect(page.locator('[data-testid^="option-"]')).toHaveCount(sequenceEasy.options.length);

  for (const id of order) await option(page, id).click();
  await expect(option(page, order[0]!)).toBeDisabled();
  await expect(option(page, order[0]!)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("chosen-3")).toHaveAttribute("data-filled", "true");
  await verify(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctSelections")).toHaveText("3");
  await expect(metric(page, "incorrectSelections")).toHaveText("0");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
});

test("sequence: wrong order, Undo and Clear count as corrections; the right order then passes", async ({ page }) => {
  await page.goto(url("sequence", "easy"));
  await start(page).click();
  await waitForRecall(page);

  await option(page, order[1]!).click();
  await option(page, order[2]!).click();
  await verify(page).click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.getByTestId("mem-undo").click();
  await expect(page.getByTestId("result")).toHaveCount(0); // a change clears the result
  await expect(option(page, order[1]!)).toBeDisabled(); // still chosen
  await expect(option(page, order[2]!)).toBeEnabled(); // undone
  await page.getByTestId("mem-clear").click();
  await expect(option(page, order[1]!)).toBeEnabled();

  for (const id of order) await option(page, id).click();
  await verify(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctionCount")).toHaveText("2");
  await expect(metric(page, "incorrectSelections")).toHaveText("2");
  await expect(metric(page, "correctSelections")).toHaveText("3");
});

test("position: lit cells show during the preview only; the exact targets pass; deselecting is a correction", async ({ page }) => {
  await page.goto(url("position", "medium"));
  await start(page).click();
  await expect(page.locator('[data-lit="true"]')).toHaveCount(targets.length);
  for (const id of targets) await expect(cell(page, id)).toHaveAttribute("data-lit", "true");

  await waitForRecall(page);
  await expect(page.locator("[data-lit]")).toHaveCount(0);
  await expect(cell(page, targets[0]!)).toHaveAttribute("aria-pressed", "false");

  await cell(page, wrongCell).click();
  await expect(cell(page, wrongCell)).toHaveAttribute("aria-pressed", "true");
  await cell(page, wrongCell).click();
  await expect(cell(page, wrongCell)).toHaveAttribute("aria-pressed", "false");
  for (const id of targets) await cell(page, id).click();
  await verify(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctSelections")).toHaveText(String(targets.length));
  await expect(metric(page, "incorrectSelections")).toHaveText("1");
  await expect(metric(page, "correctionCount")).toHaveText("1");
});

test("keyboard: Start, then options with Space in order, pass with keyboard modality", async ({ page }) => {
  await page.goto(url("sequence", "easy"));
  await start(page).focus();
  await page.keyboard.press("Enter");
  await waitForRecall(page);
  for (const id of order) {
    await option(page, id).focus();
    await page.keyboard.press("Space");
  }
  await verify(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
  await expect(metric(page, "correctSelections")).toHaveText("3");
});

test("race: New challenge or a level change during the preview leaves no old run behind", async ({ page }) => {
  await page.goto(url("sequence", "easy"));
  await start(page).click();
  await expect(page.getByTestId("mem-preview-status")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(start(page)).toBeVisible();
  await expect(page.getByTestId("mem-preview-status")).toHaveCount(0);
  await page.waitForTimeout(4500); // longer than any preview
  await expect(start(page)).toBeVisible();
  await expect(page.locator('[data-testid^="option-"]')).toHaveCount(0);
  await expect(verify(page)).toHaveCount(0);

  // The new session works on its own.
  await start(page).click();
  await waitForRecall(page);
  await expect(page.locator('[data-testid^="option-"]').first()).toBeVisible();

  // A level change during a preview behaves the same way.
  await page.goto(url("position", "easy"));
  await start(page).click();
  await expect(page.locator('[data-lit="true"]')).not.toHaveCount(0);
  await page.getByTestId("difficulty-hard").click();
  await expect(start(page)).toBeVisible();
  await page.waitForTimeout(4500);
  await expect(start(page)).toBeVisible();
  await expect(page.locator("[data-lit]")).toHaveCount(0);
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(0); // the grid exists only in preview and recall
  await expect(verify(page)).toHaveCount(0);
});

test("inspect shows the challenge configuration; privacy: no data leaves the page", async ({ page }) => {
  await page.goto(url("sequence", "easy"));
  const assertNoDataLeft = await watchPrivacy(page);
  await start(page).click();
  await waitForRecall(page);
  await expect(option(page, order[0]!)).toHaveAttribute("aria-label", /^Option \d of 5: /);
  for (const id of order) await option(page, id).click();
  await verify(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("config-variant")).toHaveText("Sequence memory");
  await expect(page.getByTestId("config-difficulty")).toHaveText("Easy");
  await expect(page.getByTestId("config-items")).toHaveText("3");
  await expect(page.getByTestId("config-previewMs")).toHaveText("4000 ms");
  await assertNoDataLeft();
});
