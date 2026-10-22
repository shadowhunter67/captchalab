import { expect, test, type Page } from "@playwright/test";
import { watchPrivacy } from "./privacy";
import { scrubTo, scrubToEdge } from "./replay";

const URL = "/playground/checkbox?seed=777";
const input = (page: Page) => page.getByTestId("checkbox-input");
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(input(page)).toBeVisible();
});

test("pointer click: pass, metrics, no motion UI", async ({ page }) => {
  await input(page).click();

  await expect(input(page)).toBeChecked();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "activationCount")).toHaveText("1");
  await expect(metric(page, "successfulActivationIndex")).toHaveText("1");
  await expect(metric(page, "inputModality")).toHaveText("mouse");
  await expect(metric(page, "reactionTime")).not.toHaveText("—");
  await expect(metric(page, "timeToFirstActivation")).not.toHaveText("—");
  await expect(metric(page, "pressDuration")).toHaveText(/ms$/);
  await expect(metric(page, "interActivationTime")).toHaveText("—"); // one activation: unavailable, not 0
  await expect(metric(page, "eventCount")).toHaveText("2");
  // A CAPTCHA without a meaningful trajectory is not forced into trajectory-centric UI.
  await expect(page.getByTestId("trajectory-svg")).toHaveCount(0);
  await expect(page.getByTestId("chart-velocity")).toHaveCount(0);
  await expect(page.getByTestId("chart-acceleration")).toHaveCount(0);
});

test("clicking the label text activates the native input and is recorded once", async ({ page }) => {
  await page.getByText("Check this box to pass the challenge").click();
  await expect(input(page)).toBeChecked();
  await expect(metric(page, "activationCount")).toHaveText("1");
  await expect(metric(page, "eventCount")).toHaveText("2");
});

test("keyboard: Tab to the checkbox, Space activates it (Enter does not)", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    if (await input(page).evaluate((el) => el === document.activeElement)) break;
  }
  await expect(input(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(input(page)).not.toBeChecked();
  await expect(page.getByTestId("result")).toHaveCount(0);

  await page.keyboard.press("Space");
  await expect(input(page)).toBeChecked();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "inputModality")).toHaveText("keyboard");
  await expect(metric(page, "activationCount")).toHaveText("1");
  await expect(metric(page, "pressDuration")).toHaveText(/ms$/);
  await expect(metric(page, "eventCount")).toHaveText("2"); // keydown + keyup; Enter is not recorded
});

test("native semantics: role, accessible name, checked state, visible focus", async ({ page }) => {
  const box = page.getByRole("checkbox", { name: "Check this box to pass the challenge" });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).toBeChecked();
  // The result is text with a symbol, not only a color, and is announced politely.
  await expect(page.getByTestId("result")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("result")).toContainText("Result: Passed");
  // Focus ring is drawn on the label row.
  await box.focus();
  const outline = await page.getByTestId("checkbox-label").evaluate((el) => getComputedStyle(el).outlineStyle);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  expect(outline).not.toBe("none");
});

test("toggling: check, uncheck clears the result, check again; activations accumulate", async ({ page }) => {
  await input(page).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await input(page).click();
  await expect(input(page)).not.toBeChecked();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.waitForTimeout(150);
  await input(page).click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "activationCount")).toHaveText("3");
  await expect(metric(page, "successfulActivationIndex")).toHaveText("3");
  await expect(metric(page, "interActivationTime")).toHaveText(/ms$/);
});

test("mixed input is reported as mixed", async ({ page }) => {
  await input(page).click();
  await input(page).click(); // uncheck with the pointer
  await input(page).focus();
  await page.keyboard.press("Space"); // check with the keyboard
  await expect(metric(page, "inputModality")).toHaveText("mixed");
  await expect(metric(page, "activationCount")).toHaveText("3");
});

test("a press released outside the control is not an activation", async ({ page }) => {
  const box = (await input(page).boundingBox())!;
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 5, box.y - 200, { steps: 4 }); // leaves the label
  await page.mouse.up();
  await expect(input(page)).not.toBeChecked();
  await expect(page.getByTestId("result")).toHaveCount(0);

  await input(page).click(); // a normal click afterwards still works
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "activationCount")).toHaveText("1"); // the aborted press did not count
});

test("activation without pointer or key events (assistive technology) still verifies; replay says why it is empty", async ({ page }) => {
  await input(page).evaluate((el: HTMLInputElement) => el.click()); // no pointer events, only a click
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "activationCount")).toHaveText("0");
  await expect(metric(page, "reactionTime")).toHaveText("—");
  await expect(metric(page, "inputModality")).toHaveText("none");
  await expect(page.getByTestId("replay-empty")).toBeVisible();
});

test("timeline selection and the event inspector show normalized fields", async ({ page }) => {
  await input(page).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("timeline-marker").first().click();
  await expect(page.getByTestId("event-field-type")).toHaveText("pointerdown");
  await expect(page.getByTestId("event-field-target")).toHaveText("checkbox-control");
  await expect(page.getByTestId("event-field-pointerType")).toHaveText("mouse");
  await expect(page.getByTestId("event-field-pointerId")).not.toHaveText("");
  await page.getByTestId("event-next").click();
  await expect(page.getByTestId("event-field-type")).toHaveText("pointerup");
  await expect(page.getByTestId("timeline-selected")).toHaveCount(1);
});

test("keyboard events appear in the inspector with their code", async ({ page }) => {
  await input(page).focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("timeline-marker").first().click();
  await expect(page.getByTestId("event-field-type")).toHaveText("keydown");
  await expect(page.getByTestId("event-field-code")).toHaveText("Space");
  await expect(page.getByTestId("event-field-target")).toHaveText("checkbox-control");
});

test("replay: checkbox state follows the recorded activation; speed, pause, scrub, restart", async ({ page }) => {
  await input(page).focus();
  // A held Space gives the replay a visible duration.
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  await expect(page.getByTestId("result")).toBeVisible();

  const replay = page.getByTestId("replay");
  const range = page.getByTestId("replay-scrubber");
  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const set = (t: number) => scrubTo(range, t);

  await scrubToEdge(range, "start");
  await expect(replay).toHaveAttribute("data-replay-checked", "false");
  await set(min + (max - min) / 2);
  await expect(replay).toHaveAttribute("data-replay-pressed", "true");
  await expect(replay).toHaveAttribute("data-replay-checked", "false");
  await scrubToEdge(range, "end");
  await expect(replay).toHaveAttribute("data-replay-checked", "true");
  await expect(replay).toHaveAttribute("data-replay-status", "finished");
  await expect(page.getByTestId("replay-play-pause")).toHaveText("Replay interaction");

  await page.getByTestId("replay-speed-2").click();
  await expect(page.getByTestId("replay-speed-2")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("replay-restart").click(); // Restart rewinds and plays
  await expect(page.getByTestId("replay-controls")).toHaveAttribute("data-status", /playing|finished/);
  await expect.poll(async () => replay.getAttribute("data-replay-status"), { timeout: 8000 }).toBe("finished");
  await expect(replay).toHaveAttribute("data-replay-checked", "true");
});

test("New challenge resets checked state, result, selection and replay", async ({ page }) => {
  await input(page).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("timeline-marker").first().click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(input(page)).not.toBeChecked();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("replay")).toHaveCount(0);
  await expect(page.getByTestId("event-inspector")).toHaveCount(0);
  await input(page).click(); // and a fresh session works: events were not carried over
  await expect(metric(page, "eventCount")).toHaveText("2");
  await expect(metric(page, "activationCount")).toHaveText("1");
});

test("learn content states the scope and limits", async ({ page }) => {
  const learn = page.getByTestId("learn");
  await expect(learn).toContainText("may be only one visible part of a larger risk or challenge system");
  await expect(learn).toContainText("does not claim to reproduce the");
  await expect(learn).toContainText("easy to automate");
});

test("privacy: no requests, console output or storage/IndexedDB/cookie writes", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await input(page).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await page.getByTestId("replay-play-pause").click();
  await page.getByTestId("replay-speed-2").click();
  await page.getByTestId("timeline-marker").first().click();
  await page.getByTestId("event-next").click();
  await input(page).focus();
  await page.keyboard.press("Space"); // uncheck by keyboard
  await assertNoDataLeft();
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("tap checks the box, is recorded as touch, and the page does not overflow", async ({ page }) => {
    await page.goto(URL);
    await input(page).tap();
    await expect(input(page)).toBeChecked();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expect(metric(page, "inputModality")).toHaveText("touch");
    await expect(metric(page, "activationCount")).toHaveText("1");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
