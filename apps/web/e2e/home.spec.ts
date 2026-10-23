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

test("Session Inspector: empty until an attempt is verified, then shows status, stats, timeline and events; Clear session resets", async ({ page }) => {
  await page.goto("/#image-grid");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(page.getByTestId("session-status")).toHaveText("No session");
  await expect(page.getByTestId("session-empty")).toBeVisible();
  await frame.getByTestId("cell-c1").click();
  await frame.getByTestId("verify").click();
  await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
  await expect(page.getByTestId("side-stat-events-value")).not.toHaveText("—");
  await expect(page.getByTestId("side-stat-input-value")).toHaveText("Mouse");
  await expect(page.getByTestId("timeline").getByRole("listitem")).toHaveCount(4);
  await expect(page.getByTestId("recent-events").getByRole("row")).toHaveCount(1 + 2); // header + pointerdown + pointerup
  await page.getByTestId("side-features").click();
  await expect(page.getByTestId("side-features-table")).toContainText("selectionCount");
  await page.getByTestId("tab-events").click();
  await expect(page.getByTestId("events-table")).toBeVisible();
  await page.getByTestId("tab-analysis").click();
  await expect(page.getByTestId("analysis-table")).toContainText("selectionCount");
  await page.getByTestId("tab-access").click();
  await expect(page.getByTestId("panel-access")).toContainText("toggle button");
  await page.getByTestId("clear-session").click();
  await expect(page.getByTestId("session-status")).toHaveText("No session");
});

test("Session Inspector shows nothing for pages without a session of their own", async ({ page }) => {
  await page.goto("/#learn");
  await expect(page.getByTestId("session-empty")).toContainText("no session of its own");
});

test("privacy: using the shell and the inspector writes nothing and sends nothing", async ({ page }) => {
  await page.goto("/#text");
  const { watchPrivacy } = await import("./privacy");
  const assertNoDataLeft = await watchPrivacy(page);
  const frame = page.frameLocator('[data-testid="preview"]');
  await frame.getByTestId("text-answer").fill("abc");
  await frame.getByTestId("verify").click();
  await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
  await page.getByTestId("tab-events").click();
  await assertNoDataLeft();
});
