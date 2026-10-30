import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 31;
const mk = registry.get("match-key").generate({ rng: createRng(SEED), variantId: "exact", difficulty: "easy" });
const tg = registry.get("tile-game").generate({ rng: createRng(SEED), variantId: "pair", difficulty: "easy" });
const metric = (page: import("@playwright/test").Page, id: string) => page.getByTestId(`metric-${id}`);

test("MatchKey: wrong then right by mouse passes; privacy holds", async ({ page }) => {
  await page.goto(`/playground/match-key?seed=${SEED}&variant=exact&difficulty=easy`);
  await expect(page.getByTestId("match-key")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  const wrong = mk.options.find((o) => o.id !== mk.correctId)!.id;
  await page.getByTestId(`option-${wrong}`).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.getByTestId(`option-${mk.correctId}`).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "selectionCount")).toHaveText("2");
  await expect(metric(page, "wrongSelectionCount")).toHaveText("1");
  await expect(metric(page, "correctionCount")).toHaveText("1");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
  await assertNoDataLeft();
});

test("MatchKey: keyboard alone completes it", async ({ page }) => {
  await page.goto(`/playground/match-key?seed=${SEED}&variant=exact&difficulty=easy`);
  const opt = page.getByTestId(`option-${mk.correctId}`);
  await opt.focus();
  await page.keyboard.press("Enter");
  await expect(opt).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("verify").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
});

test("MatchKey: New challenge resets the result", async ({ page }) => {
  await page.goto(`/playground/match-key?seed=${SEED}&variant=attribute&difficulty=hard`);
  await page.getByTestId(`option-${mk.options[0]!.id}`).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

test("Tile Game: the identical pair passes, a third tile is ignored; privacy holds", async ({ page }) => {
  await page.goto(`/playground/tile-game?seed=${SEED}&variant=pair&difficulty=easy`);
  await expect(page.getByTestId("tile-game")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  const [a, b] = tg.answerIds as [string, string];
  const other = tg.tiles.find((t) => !tg.answerIds.includes(t.id))!.id;
  await page.getByTestId(`tile-${a}`).click();
  await page.getByTestId(`tile-${b}`).click();
  await page.getByTestId(`tile-${other}`).click(); // ignored: the pair is full
  await expect(page.getByTestId("tile-status")).toContainText("2 of 2");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctPairCount")).toHaveText("1");
  await assertNoDataLeft();
});

test("Tile Game: pattern match by keyboard; a wrong set fails", async ({ page }) => {
  await page.goto(`/playground/tile-game?seed=${SEED}&variant=pattern&difficulty=easy`);
  const p = registry.get("tile-game").generate({ rng: createRng(SEED), variantId: "pattern", difficulty: "easy" });
  const wrong = p.tiles.filter((t) => !p.answerIds.includes(t.id)).slice(0, p.required).map((t) => t.id);
  for (const id of wrong) await page.getByTestId(`tile-${id}`).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  for (const id of wrong) await page.getByTestId(`tile-${id}`).click(); // deselect
  for (const id of p.answerIds) {
    await page.getByTestId(`tile-${id}`).focus();
    await page.keyboard.press("Space");
  }
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
});
