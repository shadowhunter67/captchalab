import { expect, test } from "./fixtures";

test("home: picking a challenge on the left shows it on the right and keeps it in the URL hash", async ({ page }) => {
  await page.goto("/");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByTestId("slider-handle")).toBeVisible();
  await page.getByTestId("pick-image-grid").click();
  await expect(frame.getByTestId("image-grid")).toBeVisible();
  await expect(page).toHaveURL(/#image-grid$/);
  await page.getByTestId("pick-compare").click();
  await expect(frame.getByTestId("compare-note")).toBeVisible();
});

test("home: a hash link opens that challenge", async ({ page }) => {
  await page.goto("/#text");
  await expect(page.frameLocator('[data-testid="preview"]').getByTestId("text-image")).toBeVisible();
});
