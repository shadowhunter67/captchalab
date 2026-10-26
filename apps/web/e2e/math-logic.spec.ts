import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 8;
const URL = `/playground/math-logic?seed=${SEED}&variant=arithmetic&difficulty=easy`;
const challenge = registry.get("math-logic").generate({ rng: createRng(SEED), variantId: "arithmetic", difficulty: "easy" });
const answerText = String(challenge.expectedAnswer);
const answer = (page: Page) => page.getByTestId("math-answer");
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const cfg = (page: Page, id: string) => page.getByTestId(`config-${id}`);

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("math-prompt")).toBeVisible();
});

test("typing the right answer passes; key count, modality and cleared field", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type(answerText, { delay: 40 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "keyCount")).toHaveText(String(answerText.length));
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
  await expect(answer(page)).toHaveValue("");
});

test("garbage is Not passed (whole number); Backspace corrections are counted; Enter submits", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type(`${answerText}abc`, { delay: 30 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await expect(page.getByTestId("result")).toContainText("whole number");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "backspaceCount")).toHaveText("3");
  await expect(metric(page, "correctionCount")).toHaveText("3");
  await expect(metric(page, "keyCount")).toHaveText(String(answerText.length + 3));
});

test("comparison shows two values and the larger one passes", async ({ page }) => {
  await page.goto(`/playground/math-logic?seed=${SEED}&variant=comparison&difficulty=medium`);
  await expect(page.getByTestId("math-left")).toBeVisible();
  await expect(page.getByTestId("math-right")).toBeVisible();
  await expect(page.getByTestId("math-prompt")).toHaveCount(0);
  const c = registry.get("math-logic").generate({ rng: createRng(SEED), variantId: "comparison", difficulty: "medium" });
  await answer(page).click();
  await page.keyboard.type(String(c.expectedAnswer));
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
});

test("Inspect shows the configuration; Hard resets the session and gives two operations; New challenge keeps the level", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type("1");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "variant")).toHaveText("Arithmetic");
  await expect(cfg(page, "difficulty")).toHaveText("Easy");
  await expect(cfg(page, "operations")).toHaveText("+, −");

  await page.getByTestId("difficulty-hard").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("math-prompt")).toHaveText(/^.+ [+−×] .+ [+−×] .+ = \?$/);
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("difficulty-hard")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/variant=arithmetic/);
  await expect(page.getByTestId("math-prompt")).toHaveText(/^.+ [+−×] .+ [+−×] .+ = \?$/);
});

test("privacy: key events are stored by class only and no network, storage or console use", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await answer(page).click();
  await page.keyboard.type("4821", { delay: 20 });
  await page.keyboard.press("Backspace");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();

  const codes = new Set<string>();
  await page.getByTestId("timeline-marker").first().click();
  const total = Number(/of (\d+)/.exec((await page.getByTestId("event-position").textContent()) ?? "")?.[1]);
  expect(total).toBeGreaterThan(8);
  for (let i = 0; i < total; i++) {
    codes.add((await page.getByTestId("event-field-code").textContent()) ?? "");
    await expect(page.getByTestId("event-field-target")).toHaveText("math-input");
    if (i < total - 1) await page.getByTestId("event-next").click();
  }
  for (const c of codes) expect(c).toMatch(/^(Digit|Letter|Other|Backspace)$/);
  expect(codes.has("Digit")).toBe(true);
  const inspect = (await page.getByTestId("inspect").textContent()) ?? "";
  expect(inspect).not.toContain("4821");
  await assertNoDataLeft();
});

test("the field is labelled and reachable with the keyboard", async ({ page }) => {
  await expect(page.getByLabel("Your answer")).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (await answer(page).evaluate((el) => el === document.activeElement)) break;
  }
  await expect(answer(page)).toBeFocused();
  await page.keyboard.type(answerText);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("learn")).toBeVisible();
});
