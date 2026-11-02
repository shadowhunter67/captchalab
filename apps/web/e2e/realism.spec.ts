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
