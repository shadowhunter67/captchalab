import { expect, test, type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";
import { scrubToEdge } from "./replay";

const SEED = 99;
const URL = `/playground/rotation?seed=${SEED}`;
const challenge = registry.get("rotation").generate({ rng: createRng(SEED) });
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const obj = (page: Page) => page.getByTestId("rotation-object");
/** Signed turn (degrees, clockwise-positive) that brings the object upright by the short way. */
const turnToUpright = ((((-challenge.initialAngle + 180) % 360) + 360) % 360) - 180;

async function center(page: Page) {
  const b = (await obj(page).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
const onCircle = (c: { x: number; y: number }, deg: number, r = 80) => ({
  x: c.x + r * Math.cos((deg * Math.PI) / 180), y: c.y + r * Math.sin((deg * Math.PI) / 180),
});

/** Drag around the object's center by `turn` degrees (clockwise-positive), starting at `from`. */
async function dragTurn(page: Page, turn: number, o: { from?: number; release?: boolean; steps?: number } = {}) {
  const c = await center(page);
  const from = o.from ?? 0;
  const p0 = onCircle(c, from);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  const steps = o.steps ?? 12;
  for (let i = 1; i <= steps; i++) {
    const p = onCircle(c, from + (turn * i) / steps);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(15);
  }
  if (o.release !== false) await page.mouse.up();
}
const angle = async (page: Page) => Number(await obj(page).getAttribute("data-angle"));

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(obj(page)).toBeVisible();
});

test("starts at the generated angle; dragging turns it relative to the grab point and Verify passes", async ({ page }) => {
  expect(Math.abs((await angle(page)) - challenge.initialAngle)).toBeLessThan(0.1);
  await dragTurn(page, 30, { release: false, from: 200 }); // grab anywhere: it turns by 30, it does not snap
  expect(Math.abs((await angle(page)) - ((challenge.initialAngle + 30) % 360))).toBeLessThan(1);
  await page.mouse.up();
  await dragTurn(page, turnToUpright - 30, { from: 123 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "finalAngularError")).toHaveText(/°$/);
  await expect(metric(page, "attemptCount")).toHaveText("2");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
  await expect(metric(page, "meanAngularVelocity")).toHaveText(/°\/s$/);
  await expect(page.getByTestId("chart-angular-velocity").locator("svg path").first()).toBeVisible();
});

test("keyboard: arrow keys turn 5 degrees per press and the slider value is exposed", async ({ page }) => {
  await obj(page).focus();
  const presses = Math.round(Math.abs(turnToUpright) / 5);
  const key = turnToUpright < 0 ? "ArrowLeft" : "ArrowRight";
  for (let i = 0; i < presses; i++) await page.keyboard.press(key);
  const expected = (((challenge.initialAngle + Math.sign(turnToUpright) * presses * 5) % 360) + 360) % 360;
  await expect(obj(page)).toHaveAttribute("aria-valuenow", String(Math.round(expected)));
  await expect(obj(page)).toHaveAttribute("aria-valuetext", /degrees clockwise from upright/);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText(/Passed|Not passed/);
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
  await expect(metric(page, "attemptCount")).toHaveText("1");
  await expect(metric(page, "meanAngularVelocity")).toHaveText("—");
  await expect(page.getByTestId("chart-angular-velocity")).toContainText("Not enough motion samples");
});

test("a wrong angle is Not passed and turning again clears the result", async ({ page }) => {
  await page.getByTestId("verify").click(); // still at the initial angle
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await obj(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("result")).toHaveCount(0);
});

test("pointercancel restores the angle and does not count as a result; recovery works", async ({ page }) => {
  const c = await center(page);
  const p0 = onCircle(c, 0);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  const p1 = onCircle(c, 50);
  await page.mouse.move(p1.x, p1.y, { steps: 4 });
  await obj(page).dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse", bubbles: true, clientX: p1.x, clientY: p1.y });
  await page.mouse.up();
  expect(Math.abs((await angle(page)) - challenge.initialAngle)).toBeLessThan(0.1);
  await dragTurn(page, turnToUpright);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "attemptCount")).toHaveText("2");
});

test("Inspect: timeline, event inspector and replay of the turning object", async ({ page }) => {
  await dragTurn(page, turnToUpright);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("timeline-marker").first().click();
  await expect(page.getByTestId("event-field-type")).toHaveText("pointerdown");
  await expect(page.getByTestId("event-field-target")).toHaveText("rotation-object");
  const range = page.getByTestId("replay-scrubber");
  await scrubToEdge(range, "start");
  const start = Number(await page.getByTestId("replay").getAttribute("data-replay-angle"));
  expect(Math.abs(start - challenge.initialAngle)).toBeLessThan(1);
  await scrubToEdge(range, "end");
  const end = Number(await page.getByTestId("replay").getAttribute("data-replay-angle"));
  expect(Math.min(end, 360 - end)).toBeLessThan(2);
});

test("New challenge resets angle, result and Inspect", async ({ page }) => {
  await dragTurn(page, turnToUpright);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("metric-eventCount")).toHaveText("0"); // no events carried over
});

test("privacy: no requests, console output or storage writes; Learn states the limits", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await dragTurn(page, turnToUpright);
  await obj(page).focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("replay-play-pause").click();
  await page.getByTestId("timeline-marker").first().click();
  await assertNoDataLeft();
  await expect(page.getByTestId("learn")).toContainText("does not claim to reproduce the complete");
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("touch rotation works on a phone without overflow", async ({ page }) => {
    await page.goto(URL);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", p?: { x: number; y: number }) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
    const c = await center(page);
    await touch("touchStart", onCircle(c, 0, 70));
    for (let i = 1; i <= 10; i++) await touch("touchMove", onCircle(c, (turnToUpright * i) / 10, 70));
    await touch("touchEnd");
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expect(metric(page, "inputModality")).toHaveText("touch");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
