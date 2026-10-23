import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";

const IDS = ["slider", "checkbox", "drag-drop", "rotation", "text", "image-grid"];

test("playground index lists six cards that open their playgrounds", async ({ page }) => {
  await page.goto("/playground");
  const assertNoDataLeft = await watchPrivacy(page);
  await expect(page.getByTestId("playground-cards").getByRole("listitem")).toHaveCount(6);
  for (const id of IDS) await expect(page.getByTestId(`open-${id}`)).toHaveAttribute("href", `/playground/${id}`);
  await assertNoDataLeft();
  await page.getByTestId("open-image-grid").click();
  await expect(page).toHaveURL(/\/playground\/image-grid/);
  await expect(page.getByTestId("image-grid")).toBeVisible();
});

test("learn index has every section for every CAPTCHA and the disclaimer", async ({ page }) => {
  await page.goto("/learn");
  const assertNoDataLeft = await watchPrivacy(page);
  await expect(page.getByTestId("learn-disclaimer")).toContainText("does not claim to reproduce the complete");
  for (const id of IDS) {
    const section = page.getByTestId(`learn-${id}`);
    await expect(section).toBeVisible();
    for (const h of ["How it works", "Generation", "Verification", "Behavioral signals", "Strengths", "Weaknesses", "Accessibility", "Automation considerations"]) {
      await expect(section.getByRole("heading", { name: h, exact: true })).toBeVisible();
    }
  }
  await assertNoDataLeft();
});
