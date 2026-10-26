import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry, type SequenceNumberChallenge, type SequenceVisualChallenge } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 5;
type Level = "easy" | "medium" | "hard";
const gen = (variantId: string, difficulty: Level) => registry.get("sequence").generate({ rng: createRng(SEED), variantId, difficulty });
const num = (d: Level) => gen("number", d) as unknown as SequenceNumberChallenge;
const vis = (d: Level) => gen("visual", d) as unknown as SequenceVisualChallenge;
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const cfg = (page: Page, id: string) => page.getByTestId(`config-${id}`);
const answer = (page: Page) => page.getByTestId("seq-answer");
const option = (page: Page, id: string) => page.getByTestId(`option-${id}`);
const NUMBER_URL = `/playground/sequence?seed=${SEED}&variant=number&difficulty=easy`;
const VISUAL_URL = `/playground/sequence?seed=${SEED}&variant=visual&difficulty=medium`;

test("number: the right value passes, a wrong or malformed one does not", async ({ page }) => {
  const c = num("easy");
  const text = String(c.expectedAnswer);
  await page.goto(NUMBER_URL);
  await expect(page.getByTestId("seq-hidden")).toBeVisible();
  await answer(page).click();
  await page.keyboard.type(text, { delay: 30 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "keyCount")).toHaveText(String(text.length));
  await expect(answer(page)).toHaveValue("");

  await answer(page).fill(String(c.expectedAnswer + 1));
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await answer(page).fill("12abc");
  await expect(page.getByTestId("result")).toHaveCount(0); // changing the field clears the result
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
});

test("visual: the right option passes; a wrong one first counts a correction; Space works from the keyboard", async ({ page }) => {
  const c = vis("medium");
  const wrong = c.options.find((o) => o.id !== c.expectedOptionId)!.id;
  await page.goto(VISUAL_URL);
  await expect(option(page, c.expectedOptionId)).toBeVisible();
  await expect(answer(page)).toHaveCount(0);
  await option(page, c.expectedOptionId).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");

  await page.goto(VISUAL_URL);
  await option(page, wrong).click();
  await option(page, c.expectedOptionId).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctionCount")).toHaveText("1");
  await expect(metric(page, "selectionCount")).toHaveText("2");

  await page.goto(VISUAL_URL);
  await option(page, c.expectedOptionId).focus();
  await page.keyboard.press("Space");
  await page.getByTestId("verify").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
});

test("configuration is shown; switching difficulty resets the session; New challenge keeps the setup", async ({ page }) => {
  await page.goto(NUMBER_URL);
  await answer(page).fill("1");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "variant")).toHaveText("Number");
  await expect(cfg(page, "difficulty")).toHaveText("Easy");
  await expect(cfg(page, "length")).toHaveText("5");
  await expect(cfg(page, "pattern")).toHaveText("steady step");

  await page.getByTestId("difficulty-hard").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  const hard = num("hard");
  await expect(page.locator('[data-testid^="seq-term-"]')).toHaveCount(hard.terms.length);
  await expect(page.getByTestId(`seq-term-${hard.hiddenIndex}`)).toContainText("?");
  await expect(page).toHaveURL(/difficulty=hard/);

  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page).toHaveURL(/variant=number/);
  await expect(page).toHaveURL(/difficulty=hard/);
  await expect(page.getByTestId("difficulty-hard")).toHaveAttribute("aria-pressed", "true");
});

test("switching the variant shows option buttons and no text input", async ({ page }) => {
  await page.goto(NUMBER_URL);
  await expect(answer(page)).toBeVisible();
  await page.getByTestId("variant-select").selectOption("visual");
  const c = vis("easy");
  await expect(answer(page)).toHaveCount(0);
  await expect(page.locator('[data-testid^="option-"]')).toHaveCount(c.options.length);
  await expect(page.getByTestId("seq-hidden")).toBeVisible();
});

test("privacy: nothing leaves the page for a number run or a visual run", async ({ page }) => {
  const c = num("easy");
  await page.goto(NUMBER_URL);
  let assertNoDataLeft = await watchPrivacy(page);
  await answer(page).click();
  await page.keyboard.type(String(c.expectedAnswer), { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await assertNoDataLeft();

  const v = vis("medium");
  await page.goto(VISUAL_URL);
  assertNoDataLeft = await watchPrivacy(page);
  await option(page, v.expectedOptionId).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await assertNoDataLeft();
});

test("visual hard: configuration shows the repeating unit and the number of options", async ({ page }) => {
  const c = vis("hard");
  await page.goto(`/playground/sequence?seed=${SEED}&variant=visual&difficulty=hard`);
  await option(page, c.expectedOptionId).click();
  await page.getByTestId("verify").click();
  await expect(cfg(page, "pattern")).toHaveText(/^[A-D]{4}$/);
  await expect(cfg(page, "options")).toHaveText("4");
});
