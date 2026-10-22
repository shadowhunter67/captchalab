import { expect, test, type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";
import { scrubTo, scrubToEdge } from "./replay";

const SEED = 4242;
const URL = `/playground/drag-drop?seed=${SEED}`;
const challenge = registry.get("drag-drop").generate({ rng: createRng(SEED) });
const item = (id: string) => challenge.items.find((i) => i.id === id)!;
const targetOf = (itemId: string) => challenge.targets.find((t) => t.acceptsItemId === itemId)!;
const [A, B, C] = challenge.items.map((i) => i.id) as [string, string, string];

type P = { x: number; y: number };
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

async function surface(page: Page) {
  const box = (await page.getByTestId("drag-surface").boundingBox())!;
  return { box, px: (p: { x: number; y: number }): P => ({ x: box.x + p.x * box.width, y: box.y + p.y * box.height }) };
}
async function centerOf(page: Page, id: string): Promise<P> {
  const b = (await page.getByTestId(`item-${id}`).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Drag an item from where it is now to `to` (page px), grabbing it `grab` off its center. */
async function drag(page: Page, id: string, to: P, o: { grab?: P; steps?: number; release?: boolean } = {}) {
  const from = await centerOf(page, id);
  const g = o.grab ?? { x: 0, y: 0 };
  await page.mouse.move(from.x + g.x, from.y + g.y);
  await page.mouse.down();
  await page.mouse.move(from.x + g.x + (to.x - from.x) * 0.5, from.y + g.y + (to.y - from.y) * 0.5 - 6, { steps: o.steps ?? 6 });
  await page.mouse.move(to.x + g.x, to.y + g.y, { steps: o.steps ?? 6 });
  if (o.release !== false) await page.mouse.up();
}
async function dropOnOwnTarget(page: Page, id: string) {
  const s = await surface(page);
  await drag(page, id, s.px(targetOf(id).position), { grab: { x: 4, y: -3 } });
}
async function solveAll(page: Page) {
  for (const id of [A, B, C]) await dropOnOwnTarget(page, id);
}
async function verify(page: Page) {
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.getByTestId(`item-${A}`)).toBeVisible();
  await expect(page.getByTestId("drag-status")).toContainText("0 of 3 shapes placed");
});

test("drag every shape to its area, then verify: result, metrics, trajectories, charts", async ({ page }) => {
  await expect(page.getByTestId("verify")).toBeDisabled(); // not all placed yet
  for (const id of [A, B]) await dropOnOwnTarget(page, id);
  await expect(page.getByTestId("verify")).toBeDisabled();
  await dropOnOwnTarget(page, C);
  await expect(page.getByTestId("drag-status")).toContainText("3 of 3 shapes placed");
  await expect(page.getByTestId("verify")).toBeEnabled();
  await verify(page);

  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("metric-numberOfDragAttempts")).toHaveText("3");
  await expect(page.getByTestId("metric-successfulDropCount")).toHaveText("3");
  await expect(page.getByTestId("metric-failedDropCount")).toHaveText("0");
  await expect(page.getByTestId("metric-cancelledDragCount")).toHaveText("0");
  await expect(page.getByTestId("metric-inputModality")).toHaveText("mouse");
  await expect(page.getByTestId("metric-meanReleaseError")).toHaveText(/px$/);
  await expect(page.getByTestId("metric-reactionTime")).not.toHaveText("—");
  await expect(page.getByTestId("attempt-row")).toHaveCount(3);
  await expect(page.getByTestId("trajectory-svg").locator("path").filter({ hasNot: page.locator("*") })).not.toHaveCount(0);
  for (const id of ["chart-velocity", "chart-acceleration"]) {
    await expect(page.getByTestId(id).locator("svg path").first()).toBeVisible();
    await expect(page.getByTestId(`${id}-legend`)).toBeVisible();
    await expect(page.getByTestId(`${id}-legend`).locator("li")).toHaveCount(3);
  }
});

test("a drop away from any area returns the item; then it can be placed", async ({ page }) => {
  const s = await surface(page);
  const start = s.px(item(A).start);
  await drag(page, A, { x: s.box.x + s.box.width / 2, y: s.box.y + s.box.height / 2 }); // empty middle of the board
  await expect(page.getByTestId("drag-status")).toContainText("went back");
  const back = await centerOf(page, A);
  expect(Math.abs(back.x - start.x)).toBeLessThan(2);
  expect(Math.abs(back.y - start.y)).toBeLessThan(2);
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("data-placement", "");

  await solveAll(page);
  await verify(page);
  await expect(page.getByTestId("metric-failedDropCount")).toHaveText("1");
  await expect(page.getByTestId("metric-successfulDropCount")).toHaveText("3");
  await expect(page.getByTestId("metric-numberOfDragAttempts")).toHaveText("4");
});

test("wrong targets are Not passed; dropping on an occupied area sends that shape back; re-dragging repairs it", async ({ page }) => {
  const s = await surface(page);
  await drag(page, A, s.px(targetOf(B).position)); // A on B's area (wrong)
  await drag(page, B, s.px(targetOf(A).position)); // B on A's area (wrong)
  await dropOnOwnTarget(page, C);
  await verify(page);
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await expect(page.getByTestId("metric-failedDropCount")).toHaveText("2");

  // Lifting a placed shape clears the stale result.
  const b = await centerOf(page, B);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.mouse.up(); // dropped back where it was

  // Repair: A takes its own area (B, sitting there, is sent back), then B goes to its own.
  await drag(page, A, s.px(targetOf(A).position));
  await expect(page.getByTestId("drag-status")).toContainText("went back");
  await expect(page.getByTestId(`item-${B}`)).toHaveAttribute("data-placement", "");
  await drag(page, B, s.px(targetOf(B).position));
  await verify(page);
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("metric-numberOfDragAttempts")).toHaveText("6"); // A, B, C, B (lifted and put back), A home, B home
});

test("pointercancel mid-drag returns the item, is counted as cancelled, and the user can recover", async ({ page }) => {
  const s = await surface(page);
  const start = await centerOf(page, A);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y - 80, { steps: 4 });
  await page.getByTestId(`item-${A}`).dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse", bubbles: true, clientX: start.x + 40, clientY: start.y - 80 });
  await page.mouse.up();
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("data-lifted", "false");
  const back = await centerOf(page, A);
  expect(Math.abs(back.x - start.x)).toBeLessThan(2);
  expect(Math.abs(back.y - start.y)).toBeLessThan(2);
  await expect(page.getByTestId("drag-status")).toContainText("0 of 3 shapes placed");

  await solveAll(page);
  await verify(page);
  await expect(page.getByTestId("metric-cancelledDragCount")).toHaveText("1");
  await expect(page.getByTestId("metric-failedDropCount")).toHaveText("0"); // a cancel is not a failed drop
  await expect(page.getByTestId("metric-numberOfDragAttempts")).toHaveText("4");
  void s;
});

test("grab offset: the shape does not jump to the pointer and follows it with the same offset", async ({ page }) => {
  const start = await centerOf(page, A);
  const grab = { x: 14, y: 11 };
  await page.mouse.move(start.x + grab.x, start.y + grab.y);
  await page.mouse.down();
  const afterDown = await centerOf(page, A);
  expect(Math.abs(afterDown.x - start.x)).toBeLessThan(1);
  expect(Math.abs(afterDown.y - start.y)).toBeLessThan(1);
  await page.mouse.move(start.x + grab.x + 60, start.y + grab.y - 90, { steps: 5 });
  const moved = await centerOf(page, A);
  expect(Math.abs(moved.x - (start.x + 60))).toBeLessThan(1.5);
  expect(Math.abs(moved.y - (start.y - 90))).toBeLessThan(1.5);
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("data-lifted", "true");
  await page.mouse.up();
});

test("resize during a drag cancels it and returns the shape (idle resize just repaints)", async ({ page }) => {
  const start = await centerOf(page, A);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y - 100, { steps: 4 });
  await page.setViewportSize({ width: 560, height: 800 }); // surface shrinks from 560 to the container width
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("data-lifted", "false");
  await page.mouse.up();
  await expect(page.getByTestId("drag-status")).toContainText("0 of 3 shapes placed");
  await solveAll(page);
  await verify(page);
  await expect(page.getByTestId("metric-cancelledDragCount")).toHaveText("1");
  await expect(page.getByTestId("layout-changed-note")).toBeVisible();
});

test("timeline and event inspector use semantic drag targets and sync with the trajectory", async ({ page }) => {
  await solveAll(page);
  await verify(page);
  await page.getByTestId("timeline-marker").first().click();
  await expect(page.getByTestId("event-field-type")).toHaveText("pointerdown");
  await expect(page.getByTestId("event-field-target")).toHaveText(/^drag-item:item-/);
  await expect(page.getByTestId("trajectory-selected")).toBeVisible();
  await expect(page.getByTestId("chart-velocity-selected")).toHaveCount(1);
});

test("chart data tables label each segment by item and attempt", async ({ page }) => {
  await solveAll(page);
  await verify(page);
  const details = page.getByTestId("chart-velocity-data");
  await details.locator("summary").click();
  const table = page.getByTestId("chart-velocity-table");
  await expect(page.getByTestId("chart-velocity-segment")).toHaveCount(3);
  await expect(table.locator("tbody tr").first().locator("th")).toContainText(/(Circle|Square|Triangle) · attempt 1 · sample 1/);
  await expect(table.getByRole("columnheader", { name: "Velocity (px/s)" })).toBeVisible();
  const announced = Number(/\((\d+) samples?\)/.exec((await details.locator("summary").textContent()) ?? "")?.[1]);
  await expect(table.locator("tbody tr")).toHaveCount(Math.min(announced, 100));
});

test("replay: shapes move, snap on a correct drop and return after a miss; no DOM events are replayed", async ({ page }) => {
  const s = await surface(page);
  await drag(page, A, { x: s.box.x + s.box.width / 2, y: s.box.y + s.box.height / 2 }); // miss
  await dropOnOwnTarget(page, A);
  await dropOnOwnTarget(page, B);
  await dropOnOwnTarget(page, C);
  await verify(page);

  const range = page.getByTestId("replay-scrubber");
  const replay = page.getByTestId("replay");
  const caption = page.getByTestId("replay-caption");
  const centerAttr = async (id: string) => ({
    x: Number(await page.getByTestId(`replay-item-${id}`).getAttribute("data-cx")),
    y: Number(await page.getByTestId(`replay-item-${id}`).getAttribute("data-cy")),
  });
  const layoutW = s.box.width;
  const layoutH = s.box.height;

  await scrubToEdge(range, "start");
  const startA = await centerAttr(A);
  expect(Math.abs(startA.x - item(A).start.x * layoutW)).toBeLessThan(2);

  const seen = new Set<string>();
  let lifted = false;
  for (let i = 0; i <= 40; i++) {
    await scrubTo(range, Number(await range.getAttribute("min")) + ((Number(await range.getAttribute("max")) - Number(await range.getAttribute("min"))) * i) / 40);
    seen.add((await caption.textContent()) ?? "");
    if ((await page.getByTestId(`replay-item-${A}`).getAttribute("data-lifted")) === "true") lifted = true;
  }
  expect(lifted).toBe(true);
  expect([...seen].some((c) => c.includes("(returned)"))).toBe(true); // failed drop reset
  expect([...seen].some((c) => c.includes("matching target"))).toBe(true); // snap

  await scrubToEdge(range, "end");
  await expect(replay).toHaveAttribute("data-replay-status", "finished");
  for (const id of [A, B, C]) {
    const c = await centerAttr(id);
    const t = targetOf(id).position;
    expect(Math.abs(c.x - t.x * layoutW)).toBeLessThan(1.5);
    expect(Math.abs(c.y - t.y * layoutH)).toBeLessThan(1.5);
  }
  await page.getByTestId("replay-speed-2").click();
  await page.getByTestId("replay-restart").click();
  await expect.poll(() => replay.getAttribute("data-replay-status"), { timeout: 10000 }).toBe("finished");
});

test("New challenge resets the board, result, selection and replay", async ({ page }) => {
  await solveAll(page);
  await verify(page);
  await page.getByTestId("timeline-marker").first().click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("replay")).toHaveCount(0);
  await expect(page.getByTestId("drag-status")).toContainText("0 of 3 shapes placed");
  await expect(page.getByTestId("verify")).toBeDisabled();
  for (const it of challenge.items) await expect(page.getByTestId(`item-${it.id}`)).toHaveAttribute("data-placement", "");
});

test("accessibility: named shapes and areas, status in words, honest pointer-only note, Learn", async ({ page }) => {
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("aria-label", /draggable with a pointer\. Not placed/);
  await expect(page.getByTestId(`drop-${targetOf(A).id}`)).toHaveAttribute("aria-label", /Drop area for the .*Empty/);
  await dropOnOwnTarget(page, A);
  await expect(page.getByTestId(`item-${A}`)).toHaveAttribute("aria-label", /On the .* drop area/);
  await expect(page.getByTestId("drag-status")).toHaveAttribute("role", "status");
  await solveAll(page);
  await verify(page);
  await expect(page.getByTestId("result")).toContainText("Result: Passed");
  await expect(page.getByText(/no keyboard\s+alternative yet/i).first()).toBeVisible();
  const learn = page.getByTestId("learn");
  await expect(learn).toContainText("does not claim to reproduce the complete internal mechanisms");
  await expect(learn).toContainText("no keyboard alternative");
  await expect(learn).toContainText("does not integrate with or automate any third-party service");
});

test("privacy: no requests, console output or storage/IndexedDB/cookie writes", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await solveAll(page);
  await verify(page);
  await page.getByTestId("replay-play-pause").click();
  await page.getByTestId("timeline-marker").first().click();
  await page.getByTestId("event-next").click();
  await page.getByTestId("chart-velocity-data").locator("summary").click();
  await assertNoDataLeft();
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("touch drags work on a phone-sized board without horizontal overflow", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId(`item-${A}`)).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", p?: P) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
    const s = await surface(page);
    for (const id of [A, B, C]) {
      const from = await centerOf(page, id);
      const to = s.px(targetOf(id).position);
      await touch("touchStart", from);
      for (let i = 1; i <= 8; i++) await touch("touchMove", { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 });
      await touch("touchEnd");
    }
    await expect(page.getByTestId("drag-status")).toContainText("3 of 3 shapes placed");
    await verify(page);
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expect(metric(page, "inputModality")).toHaveText("touch");
    await expect(metric(page, "successfulDropCount")).toHaveText("3");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
