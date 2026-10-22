import { expect, test, type Locator, type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { watchPrivacy } from "./privacy";
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

/** A drag that lasts about a second, so replay tests have time to pause/scrub it deterministically. */
async function slowDrag(page: Page, toPosition: number) {
  const g = await geometry(page);
  await page.mouse.move(g.startX, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(g.xAt((toPosition * i) / 20), g.y + (i % 3));
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
}

const replay = (page: Page) => page.getByTestId("replay");
const replayTime = async (page: Page) => Number(await replay(page).getAttribute("data-replay-time"));
const replayStatus = (page: Page) => replay(page).getAttribute("data-replay-status");

async function scrubTo(range: Locator, time: number) {
  // Browsers normalise range values to ~15 significant digits, and Playwright rejects a value that
  // changes when set ("Malformed value"). So: clamp to the control's bounds, then use 3 decimals.
  const min = Math.ceil(Number(await range.getAttribute("min")) * 1000) / 1000;
  const max = Math.floor(Number(await range.getAttribute("max")) * 1000) / 1000;
  // String(Number(..)) drops trailing zeros: the exact text the browser reports back for that value.
  await range.fill(String(Number(Math.min(max, Math.max(min, time)).toFixed(3))));
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/playground/slider?seed=${SEED}`);
  await expect(page.getByTestId("slider-handle")).toBeVisible();
});

test("drag to the target: result, metrics, charts, trajectory and replay", async ({ page }) => {
  await drag(page, challenge.target);

  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("metric-dragDuration")).not.toHaveText("—");
  await expect(page.getByTestId("metric-releaseError")).toHaveText(/px$/);
  await expect(page.getByTestId("metric-numberOfAttempts")).toHaveText("1");
  await expect(page.getByTestId("metric-eventCount")).not.toHaveText("—");
  await expect(page.getByTestId("trajectory-svg")).toBeVisible();

  for (const id of ["chart-velocity", "chart-acceleration"]) {
    const chart = page.getByTestId(id);
    await expect(chart.locator("svg path").first()).toBeVisible();
    await expect(page.getByTestId(`${id}-summary`)).toContainText("ranged from");
  }
  // Zero-height SVG lines are never "visible" to Playwright: assert presence.
  await expect(page.getByTestId("chart-acceleration-zero")).toHaveCount(1); // signed data: baseline at 0
});

test("releasing far from the target is reported as not passed", async ({ page }) => {
  await drag(page, Math.min(1, challenge.target + 0.4));
  await expect(page.getByTestId("result")).toContainText("Not passed");
});

test("replay: play, pause holds the time, resume continues, speed, restart", async ({ page }) => {
  await slowDrag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();

  const start = await replayTime(page);
  await page.getByTestId("replay-speed-0.5").click();
  await expect(page.getByTestId("replay-speed-0.5")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("replay-play-pause").click();
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", "playing");
  await expect.poll(() => replayTime(page)).toBeGreaterThan(start);

  await page.getByTestId("replay-play-pause").click(); // pause
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", "paused");
  const held = await replayTime(page);
  await page.waitForTimeout(400);
  expect(await replayTime(page)).toBe(held);

  await page.getByTestId("replay-speed-2").click();
  await page.getByTestId("replay-play-pause").click(); // resume
  await expect.poll(() => replayTime(page)).toBeGreaterThan(held);

  await page.getByTestId("replay-restart").click();
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", /playing|finished/);
  await expect.poll(() => replayStatus(page), { timeout: 8000 }).toBe("finished");
});

test("replay: scrubbing works while paused and while playing", async ({ page }) => {
  await slowDrag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();
  const range = page.getByTestId("replay-scrubber");
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const mid = min + (max - min) / 2;

  await scrubTo(range, mid);
  await expect.poll(() => replayTime(page)).toBeGreaterThanOrEqual(Math.round(mid) - 1);
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", "paused");

  await page.getByTestId("replay-speed-0.5").click();
  await page.getByTestId("replay-play-pause").click();
  await scrubTo(range, min + (max - min) * 0.25);
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", "playing"); // keeps playing

  await scrubTo(range, max); // to the end: finished
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", "finished");
  await expect(page.getByTestId("replay-play-pause")).toHaveText("Replay interaction");
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
  await expect(page.getByTestId("metric-numberOfAttempts")).toHaveText("2");
});

test("Try again twice: reset markers appear and replay shows the handle back at 0", async ({ page }) => {
  await slowDrag(page, 0.7);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: /Try again/ }).click();
  await slowDrag(page, 0.6);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: /Try again/ }).click();
  await slowDrag(page, challenge.target);
  await expect(page.getByTestId("metric-numberOfAttempts")).toHaveText("3");

  const resets = page.getByTestId("timeline-reset");
  await expect(resets).toHaveCount(2);
  const t = Number(await resets.first().getAttribute("data-t"));

  // Just after the first reset the handle is back at the track start; just before it, it was not.
  const range = page.getByTestId("replay-scrubber");
  await scrubTo(range, t + 1);
  await expect.poll(async () => Number(await page.getByTestId("replay-handle").getAttribute("x"))).toBe(0);
  await scrubTo(range, t - 1);
  await expect.poll(async () => Number(await page.getByTestId("replay-handle").getAttribute("x"))).toBeGreaterThan(50);
});

test("event timeline selection syncs inspector, trajectory and charts", async ({ page }) => {
  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();

  await expect(page.getByTestId("event-position")).toContainText("events");
  await page.getByTestId("timeline-marker").first().click(); // the first marker is the press
  await expect(page.getByTestId("event-position")).toContainText("Selected event #");
  await expect(page.getByTestId("event-field-type")).toHaveText("pointerdown");
  await expect(page.getByTestId("event-field-target")).toHaveText("slider-handle");
  await expect(page.getByTestId("trajectory-selected")).toBeVisible();
  await expect(page.getByTestId("chart-velocity-selected")).toHaveCount(1);
  await expect(page.getByTestId("timeline-selected")).toHaveCount(1);

  await page.getByTestId("event-next").click();
  await expect(page.getByTestId("event-field-type")).toHaveText("pointermove");
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByTestId("trajectory-selected")).toHaveCount(0);
});

test("charts have an accessible data table with the same samples, units and per-drag segments", async ({ page }) => {
  await slowDrag(page, 0.7);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByRole("button", { name: /Try again/ }).click();
  await slowDrag(page, challenge.target);
  await expect(page.getByTestId("metric-numberOfAttempts")).toHaveText("2");

  for (const [id, unit, header] of [
    ["chart-velocity", "px/s", "Velocity (px/s)"],
    ["chart-acceleration", "px/s²", "Acceleration (px/s²)"],
  ] as const) {
    const details = page.getByTestId(`${id}-data`);
    await expect(page.getByTestId(`${id}-table`)).toHaveCount(0); // collapsed: not rendered
    await details.locator("summary").click();
    const table = page.getByTestId(`${id}-table`);
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Time" })).toBeVisible();
    await expect(table.locator("caption")).toContainText("not connected");
    await expect(page.getByTestId(`${id}-segment`)).toHaveCount(2); // one <tbody> per drag
    await expect(table.locator("tbody tr").first().locator("td").last()).toContainText(unit);

    // Same dataset as the chart: the row count equals the sample count announced in the summary.
    const summary = (await details.locator("summary").textContent()) ?? "";
    const announced = Number(/\((\d+) samples?\)/.exec(summary)?.[1]);
    expect(announced).toBeGreaterThan(0);
    await expect(table.locator("tbody tr")).toHaveCount(Math.min(announced, 100));
  }
});

test("no data table when there is nothing to chart", async ({ page }) => {
  await page.getByTestId("slider-handle").focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("chart-velocity")).toContainText("Not enough motion samples");
  await expect(page.getByTestId("chart-velocity-data")).toHaveCount(0);
  await expect(page.getByTestId("chart-acceleration-data")).toHaveCount(0);
});

test("New challenge resets Inspect and replay completely", async ({ page }) => {
  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("timeline-marker").first().click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("trajectory-svg")).toHaveCount(0);
  await expect(page.getByTestId("replay")).toHaveCount(0);
  await expect(page.getByTestId("event-inspector")).toHaveCount(0);
});

test("keyboard: arrows then Enter submits; charts explain there is no drag", async ({ page }) => {
  await page.getByTestId("slider-handle").focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("metric-numberOfAttempts")).toHaveText("0");
  await expect(page.getByTestId("chart-velocity")).toContainText("Not enough motion samples");
  await expect(page.getByTestId("trajectory-empty")).toBeVisible();
});

test("raw interaction data stays local: no requests, storage writes or console output while interacting", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await drag(page, challenge.target);
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("replay-play-pause").click();
  await page.getByTestId("replay-speed-2").click();
  await page.getByTestId("timeline-marker").first().click();
  await page.getByTestId("event-next").click();
  await page.getByTestId("chart-velocity-data").locator("summary").click();
  await assertNoDataLeft();
});
