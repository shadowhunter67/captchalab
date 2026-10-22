import { expect, test, type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";

const SEED = 12345;
// Same generator the page uses, so the target is known without peeking at the UI.
const challenge = registry.get("slider").generate({ rng: createRng(SEED) });

async function geometry(page: Page) {
  const track = await page.getByTestId("slider-track").boundingBox();
  const handle = await page.getByTestId("slider-handle").boundingBox();
  if (!track || !handle) throw new Error("slider not rendered");
  const travel = track.width - handle.width;
  return {
    startX: handle.x + handle.width / 2,
    y: handle.y + handle.height / 2,
    // Handle centered under the pointer: pointer x = track.x + handleWidth/2 + position * travel.
    xAt: (position: number) => track.x + handle.width / 2 + position * travel,
  };
}

async function drag(page: Page, toPosition: number) {
  const g = await geometry(page);
  await page.mouse.move(g.startX - 40, g.y);
  await page.mouse.move(g.startX, g.y);
  await page.mouse.down();
  await page.mouse.move(g.xAt(toPosition * 0.6), g.y + 3, { steps: 8 });
  await page.mouse.move(g.xAt(toPosition), g.y, { steps: 8 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/playground/slider?seed=${SEED}`);
  await expect(page.getByTestId("slider-handle")).toBeVisible();
});

test("drag to the target: result, metrics, trajectory and replay", async ({ page }) => {
  await drag(page, challenge.target);

  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("metric-drag-duration")).not.toHaveText("n/a");
  await expect(page.getByTestId("metric-release-error")).toHaveText(/px$/);
  await expect(page.getByTestId("metric-number-of-attempts")).toHaveText("1");
  await expect(page.getByTestId("metric-event-count")).not.toHaveText("n/a");
  await expect(page.getByTestId("trajectory-svg")).toBeVisible();

  await page.getByRole("button", { name: "Replay interaction" }).click();
  await expect(page.getByLabel("Replay position")).toBeVisible();
});

test("releasing far from the target is reported as not passed", async ({ page }) => {
  await drag(page, Math.min(1, challenge.target + 0.4));
  await expect(page.getByTestId("result")).toContainText("Not passed");
});

test("pointercancel does not submit; a later drag still works", async ({ page }) => {
  const g = await geometry(page);
  await page.mouse.move(g.startX, g.y);
  await page.mouse.down();
  await page.mouse.move(g.xAt(0.3), g.y, { steps: 5 });
  await page.getByTestId("slider-handle").dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
    bubbles: true,
    clientX: g.xAt(0.3),
    clientY: g.y,
  });
  await page.mouse.up();
  await expect(page.getByTestId("result")).toHaveCount(0);

  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("metric-number-of-attempts")).toHaveText("2");
});

test("New challenge resets result and replay", async ({ page }) => {
  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await expect(page.getByTestId("trajectory-svg")).toHaveCount(0);
});

test("keyboard: arrows then Enter submits", async ({ page }) => {
  await page.getByTestId("slider-handle").focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("metric-number-of-attempts")).toHaveText("0");
});

test("raw interaction data stays local: no requests, storage or console output while interacting", async ({ page }) => {
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  const logs: string[] = [];
  page.on("request", (r) => requests.push(`${r.method()} ${r.url()}`));
  page.on("console", (m) => logs.push(m.text()));
  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: "Replay interaction" }).click();
  expect(requests).toEqual([]);
  expect(logs).toEqual([]);
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored).toBe(0);
});
