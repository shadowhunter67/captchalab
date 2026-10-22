import { expect, test, type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 31;
const URL = `/playground/text?seed=${SEED}`;
const challenge = registry.get("text").generate({ rng: createRng(SEED) });
const answer = (page: Page) => page.getByTestId("text-answer");
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("text-image")).toBeVisible();
});

test("typing the text (any case) passes; metrics and modality are shown", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type(challenge.text.toLowerCase(), { delay: 40 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "keyCount")).toHaveText("6");
  await expect(metric(page, "backspaceCount")).toHaveText("0");
  await expect(metric(page, "interKeyTimeMean")).toHaveText(/ms$/);
  await expect(metric(page, "reactionTime")).not.toHaveText("—");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
  await expect(metric(page, "attemptCount")).toHaveText("1");
  await expect(answer(page)).toHaveValue(""); // a passed answer is not left in the field
});

test("changing the field by paste (no key events) clears a stale result", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type("zzz");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await answer(page).evaluate((el: HTMLInputElement) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(el, "pasted");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.getByTestId("result")).toHaveCount(0);
});

test("a wrong answer is Not passed; correcting it with Backspace counts corrections; Enter submits", async ({ page }) => {
  await answer(page).click();
  await page.keyboard.type(challenge.text.slice(0, 5) + (challenge.text.endsWith("A") ? "B" : "A"), { delay: 30 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.keyboard.press("Backspace"); // typing again clears the stale result
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.keyboard.type(challenge.text.slice(5), { delay: 30 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "backspaceCount")).toHaveText("1");
  await expect(metric(page, "correctionCount")).toHaveText("1");
  await expect(metric(page, "keyCount")).toHaveText("7");
});

test("privacy: stored key events never say which letter or digit was pressed, and the text is not echoed", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await answer(page).click();
  await page.keyboard.type(challenge.text, { delay: 20 });
  await page.keyboard.type("-;'", { delay: 20 }); // punctuation must not be stored by its code either
  await page.keyboard.press("Backspace");
  await page.keyboard.type(challenge.text.slice(-1), { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();

  const codes = new Set<string>();
  await page.getByTestId("timeline-marker").first().click();
  const total = Number(/of (\d+)/.exec((await page.getByTestId("event-position").textContent()) ?? "")?.[1]);
  expect(total).toBeGreaterThan(10);
  for (let i = 0; i < total; i++) {
    codes.add((await page.getByTestId("event-field-code").textContent()) ?? "");
    await expect(page.getByTestId("event-field-target")).toHaveText("text-input");
    if (i < total - 1) await page.getByTestId("event-next").click();
  }
  expect(codes.has("Other")).toBe(true); // the punctuation was stored only as its class
  for (const c of codes) expect(c).toMatch(/^(Letter|Digit|Other|Backspace)$/);

  const inspect = (await page.getByTestId("inspect").textContent()) ?? "";
  expect(inspect.toUpperCase()).not.toContain(challenge.text);
  await assertNoDataLeft();
});

test("New challenge clears the field, result and recording; the field is labelled and keyboard reachable", async ({ page }) => {
  await expect(page.getByLabel("Characters in the image")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab"); // link, then the field
  await expect(answer(page)).toBeFocused();
  await page.keyboard.type("abc");
  await page.getByTestId("verify").click();
  await expect(metric(page, "keyCount")).toHaveText("3");
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(answer(page)).toHaveValue("");
  await answer(page).click();
  await page.keyboard.type("x");
  await page.getByTestId("verify").click();
  await expect(metric(page, "keyCount")).toHaveText("1"); // nothing carried over
  await expect(page.getByTestId("learn")).toContainText("does not claim to reproduce the complete");
});
