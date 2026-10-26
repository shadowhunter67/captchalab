import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 21;
const URL = `/playground/shape-matching?seed=${SEED}&variant=exact&difficulty=easy`;
const challenge = registry.get("shape-matching").generate({ rng: createRng(SEED), variantId: "exact", difficulty: "easy" });
const sources = challenge.sources.map((s) => s.id);
const correct = (sourceId: string): string => challenge.matches[sourceId]!;
const source = (page: Page, id: string) => page.getByTestId(`source-${id}`);
const target = (page: Page, id: string) => page.getByTestId(`target-${id}`);
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const cfg = (page: Page, id: string) => page.getByTestId(`config-${id}`);

async function solve(page: Page) {
  for (const s of sources) {
    await source(page, s).click();
    await target(page, correct(s)).click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId("shape-matching")).toBeVisible();
});

test("matching every source with its target passes; metrics are shown", async ({ page }) => {
  await solve(page);
  await expect(page.getByTestId("match-status")).toContainText(`${sources.length} of ${sources.length} shapes matched`);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "correctMatchCount")).toHaveText(String(sources.length));
  await expect(metric(page, "incorrectMatchCount")).toHaveText("0");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
});

test("a wrong match is corrected; clicking a matched target with nothing selected removes it", async ({ page }) => {
  const [a, b] = sources as [string, string];
  await source(page, a).click();
  await target(page, correct(b)).click(); // wrong
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await target(page, correct(b)).click(); // nothing selected: removes the wrong match
  await expect(page.getByTestId("result")).toHaveCount(0);
  await expect(page.getByTestId("match-status")).toContainText("0 of");
  await solve(page);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "incorrectMatchCount")).toHaveText("1");
  await expect(metric(page, "correctionCount")).not.toHaveText("0");
});

test("keyboard: Space on a source, Enter on its target", async ({ page }) => {
  let n = 0;
  for (const s of sources) {
    await source(page, s).focus();
    await page.keyboard.press(n++ % 2 === 0 ? "Space" : "Enter");
    await expect(source(page, s)).toHaveAttribute("aria-pressed", "true");
    await target(page, correct(s)).focus();
    await page.keyboard.press("Enter");
  }
  await page.getByTestId("verify").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
});

test("the configuration is shown; changing difficulty resets, New challenge keeps the setup", async ({ page }) => {
  await page.getByTestId("verify").click();
  await expect(cfg(page, "variant")).toHaveText("Exact shape");
  await expect(cfg(page, "difficulty")).toHaveText("Easy");
  await expect(cfg(page, "pairs")).toHaveText("3");
  await expect(page.locator('[data-testid^="source-"]')).toHaveCount(3);

  await page.getByTestId("difficulty-hard").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.locator('[data-testid^="source-"]')).toHaveCount(5);

  await page.getByTestId("verify").click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("difficulty-hard")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-testid^="source-"]')).toHaveCount(5);
  await page.getByTestId("verify").click();
  await expect(cfg(page, "variant")).toHaveText("Exact shape");
  await expect(page.getByTestId("learn")).toBeVisible();
});

test("privacy: nothing leaves the page and buttons are labelled", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  const [a] = sources as [string];
  await expect(source(page, a)).toHaveAttribute("aria-label", new RegExp(`^Source 1 of ${sources.length}: `));
  await expect(source(page, a)).toHaveAttribute("aria-pressed", "false");
  await solve(page);
  await expect(source(page, a)).toHaveAttribute("aria-label", /matched to target \d/);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await assertNoDataLeft();
});
