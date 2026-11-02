import { type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { expectedSelection, registry } from "@captchalab/captcha-plugins";
import { expect, test } from "./fixtures";
import { expectValidIds } from "./a11y";
import { watchPrivacy } from "./privacy";

/**
 * v1.1 realism: each upgraded challenge is completed through the real UI, with the answer derived from the same seeded
 * generator the page uses (never read from the page). Pictures are CaptchaLab's own drawings, so nothing is fetched.
 */
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

// ----------------------------------------------------------------------------------------------------- Image Grid
for (const variant of ["photo-categories", "scene-objects"] as const) {
  const SEED = 17;
  const challenge = registry.get("image-grid").generate({ rng: createRng(SEED), variantId: variant, difficulty: "medium" });
  const good = expectedSelection(challenge);

  test(`Image Grid ${variant}: select the pictures, Verify, Passed; names do not give the answer; nothing is fetched`, async ({ page }) => {
    await page.goto(`/playground/image-grid?seed=${SEED}&variant=${variant}&difficulty=medium`);
    await expect(page.getByTestId("image-grid")).toBeVisible();
    const assertNoDataLeft = await watchPrivacy(page);
    // The accessible name of every tile is only its number: it never names the object.
    for (const cell of challenge.cells) {
      await expect(page.getByTestId(`cell-${cell.id}`)).toHaveAttribute("aria-label", /^Image \d of 9$/);
    }
    await expect(page.getByTestId("grid-alternative")).toHaveAttribute("href", /playground\/audio/);
    for (const id of good) await page.getByTestId(`cell-${id}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expect(metric(page, "selectionCount")).toHaveText(String(good.length));
    await assertNoDataLeft();
    await expectValidIds(page);
  });

  test(`Image Grid ${variant}: a wrong tile fails, and the keyboard alone can finish it`, async ({ page }) => {
    await page.goto(`/playground/image-grid?seed=${SEED}&variant=${variant}&difficulty=medium`);
    const wrong = challenge.cells.find((c) => c.shape !== challenge.target)!.id;
    await page.getByTestId(`cell-${wrong}`).click();
    for (const id of good) await page.getByTestId(`cell-${id}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Not passed");
    await page.getByTestId(`cell-${wrong}`).focus();
    await page.keyboard.press("Space"); // deselect the wrong tile
    await expect(page.getByTestId("result")).toHaveCount(0);
    await page.getByTestId("verify").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("result")).toContainText("Passed");
  });
}

test("Image Grid pictures: the same seed draws the same grid; New challenge replaces it", async ({ page }) => {
  const url = "/playground/image-grid?seed=5&variant=photo-categories&difficulty=hard";
  await page.goto(url);
  const first = await page.getByTestId("image-grid").innerHTML();
  await page.goto(url);
  expect(await page.getByTestId("image-grid").innerHTML()).toBe(first);
  await page.getByTestId("cell-c1").click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("cell-c1")).toHaveAttribute("aria-pressed", "false");
  expect(await page.getByTestId("image-grid").innerHTML()).not.toBe(first);
});

// ------------------------------------------------------------------------------------------------------- Slider
test("Slider puzzle: the piece follows the handle, fits the gap at the target, and Passed", async ({ page }) => {
  const SEED = 7;
  const c = registry.get("slider").generate({ rng: createRng(SEED), variantId: "puzzle", difficulty: "medium" });
  await page.goto(`/playground/slider?seed=${SEED}&variant=puzzle&difficulty=medium`);
  await expect(page.getByTestId("puzzle-picture")).toBeVisible();
  await expect(page.getByTestId("slider-target")).toHaveCount(0); // the gap is the target; no marker on the bar
  const piece = page.getByTestId("puzzle-piece");
  const before = await piece.getAttribute("transform");
  const handle = page.getByTestId("slider-handle");
  await handle.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < Math.round(c.target * 100); i++) await page.keyboard.press("ArrowRight");
  expect(await piece.getAttribute("transform")).not.toBe(before); // the piece moved with the handle
  await expect(piece).toHaveAttribute("transform", /translate\((-?0(\.\d+)?|-?\d\.\d+e-\d+) 0\)/); // and sits on the gap (shift ~ 0)
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expectValidIds(page);
});

test("Slider puzzle: released far from the gap is Not passed; Try again resets the piece; the accessible name does not say where the gap is", async ({ page }) => {
  await page.goto("/playground/slider?seed=7&variant=puzzle&difficulty=medium");
  const handle = page.getByTestId("slider-handle");
  await expect(handle).toHaveAttribute("aria-label", /Puzzle slider handle/);
  await handle.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.getByRole("button", { name: "Try again (same challenge)" }).click();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await expect(handle).toHaveAttribute("aria-valuenow", "0");
});
