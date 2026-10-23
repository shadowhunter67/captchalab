import { expect, test } from "@playwright/test";
import { watchPrivacy } from "./privacy";

// These tests do NOT use the English fixture: they check the real default (Vietnamese) and the switch.

test("default is Vietnamese and the EN button switches the page to English and back", async ({ page }) => {
  await page.goto("/playground/image-grid?seed=17");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CAPTCHA lưới ảnh");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByTestId("verify")).toHaveText("Xác minh");
  await page.getByTestId("lang-en").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Image Grid CAPTCHA");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/lang=en/);
  await page.getByTestId("lang-vi").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CAPTCHA lưới ảnh");
});

test("a Vietnamese result and metrics are shown after verifying", async ({ page }) => {
  await page.goto("/playground/image-grid?seed=17");
  await page.getByTestId("cell-c1").click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Chưa đạt");
  await expect(page.getByTestId("metric-selectionCount")).toBeVisible();
  await expect(page.getByTestId("inspect")).toContainText("Chỉ số");
});

test("home: Vietnamese by default, preview on the right follows the language, back link leaves the frame", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CaptchaLab");
  await expect(page.getByTestId("pick-slider")).toContainText("Thanh trượt");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByRole("heading", { level: 1 })).toHaveText("CAPTCHA thanh trượt");
  await page.getByTestId("lang-en").click();
  await expect(page.getByTestId("pick-slider")).toContainText("Slider");
  await expect(frame.getByRole("heading", { level: 1 })).toHaveText("Slider CAPTCHA");
  // The switch is not drawn a second time inside the preview frame.
  await expect(frame.getByTestId("lang-en")).toHaveCount(0);
});

test("privacy: switching language writes nothing and sends nothing", async ({ page }) => {
  await page.goto("/playground/text");
  const assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("lang-en").click();
  await page.getByTestId("lang-vi").click();
  await assertNoDataLeft();
});
