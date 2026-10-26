import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 9;
const PAGE_URL = `/playground/audio?seed=${SEED}&variant=spoken-digits&difficulty=easy`;
const challenge = registry.get("audio").generate({ rng: createRng(SEED), variantId: "spoken-digits", difficulty: "easy" });
const wrong = challenge.digits.slice(0, -1) + String((Number(challenge.digits.at(-1)) + 1) % 10);
const answer = (page: Page) => page.getByTestId("audio-answer");
const play = (page: Page) => page.getByTestId("audio-play");
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const cfg = (page: Page, id: string) => page.getByTestId(`config-${id}`);

test("nothing plays on load; Play, then the right digits pass; Replay counts a second play", async ({ page }) => {
  const wavs: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".wav")) wavs.push(r.url());
  });
  await page.goto(PAGE_URL);
  await expect(play(page)).toBeVisible();
  await expect(play(page)).toHaveText("Play");
  await expect(play(page)).toHaveAttribute("data-playing", "false");
  await page.waitForTimeout(500);
  expect(wavs).toHaveLength(0); // no auto-play: no clip is even requested before Play

  await play(page).click();
  await expect(play(page)).toHaveText("Replay");
  await expect.poll(() => wavs.length).toBeGreaterThan(0);
  await answer(page).click();
  await page.keyboard.type(challenge.digits, { delay: 30 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "playCount")).toHaveText("1");
  await expect(metric(page, "keyCount")).toHaveText(String(challenge.digits.length));
  await expect(metric(page, "timeToFirstPlay")).not.toHaveText("—");
  await expect(metric(page, "inputModality")).toHaveText(/mouse|keyboard|mixed/);
  await expect(answer(page)).toHaveValue("");

  await play(page).click(); // Replay
  await answer(page).click();
  await page.keyboard.type(challenge.digits, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "playCount")).toHaveText("2");
});

test("wrong digits are Not passed; Backspace corrections are counted; Play works from the keyboard", async ({ page }) => {
  await page.goto(PAGE_URL);
  await play(page).focus();
  await page.keyboard.press("Enter");
  await expect(play(page)).toHaveText("Replay");
  await answer(page).click();
  await page.keyboard.type(wrong, { delay: 20 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.keyboard.press("Backspace"); // typing again clears the stale result
  await expect(page.getByTestId("result")).toHaveCount(0);
  await page.keyboard.type(challenge.digits.slice(-1), { delay: 20 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "playCount")).toHaveText("1");
  await expect(metric(page, "backspaceCount")).toHaveText("1");
  await expect(metric(page, "correctionCount")).toHaveText("1");
  await expect(metric(page, "keyCount")).toHaveText(String(challenge.digits.length + 1));
});

test("challenge configuration follows the difficulty; New challenge keeps variant and difficulty", async ({ page }) => {
  await page.goto(PAGE_URL);
  await answer(page).click();
  await page.keyboard.type("1");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "digits")).toHaveText("4");
  await expect(cfg(page, "gapMs")).toHaveText("600 ms");
  await expect(cfg(page, "noise")).toHaveText("None");

  await page.getByTestId("difficulty-hard").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0); // the session was reset
  await answer(page).click();
  await page.keyboard.type("1");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "digits")).toHaveText("6");
  await expect(cfg(page, "gapMs")).toHaveText("240 ms");
  await expect(cfg(page, "noise")).toHaveText("Moderate");

  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await answer(page).click();
  await page.keyboard.type("1");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "digits")).toHaveText("6");
  await expect(page.getByTestId("variant-select")).toHaveValue("spoken-digits");
});

test("a missing audio file fails gracefully: visible alert, the field and Verify still work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/audio/digits/*.wav", (r) => r.abort());
  await page.goto(PAGE_URL);
  await play(page).click();
  await expect(page.getByTestId("audio-error")).toBeVisible();
  await expect(page.getByTestId("audio-error")).toContainText("The audio could not be loaded");
  await expect(play(page)).toHaveAttribute("data-playing", "false");
  await expect(page.getByTestId("audio-alternative")).toBeVisible();
  await answer(page).click();
  await page.keyboard.type(challenge.digits, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  expect(errors).toEqual([]);
});

test("the microphone and speech synthesis are never used; an alternative challenge is offered", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __micCalls: number; MediaRecorder?: unknown };
    w.__micCalls = 0;
    const md = navigator.mediaDevices;
    if (md && md.getUserMedia) {
      const orig = md.getUserMedia.bind(md);
      md.getUserMedia = (...args: Parameters<MediaDevices["getUserMedia"]>) => {
        w.__micCalls++;
        return orig(...args);
      };
    }
    if (w.MediaRecorder) {
      const Orig = w.MediaRecorder as new (...a: unknown[]) => unknown;
      w.MediaRecorder = function (...a: unknown[]) {
        w.__micCalls++;
        return new Orig(...a);
      };
    }
    if (window.speechSynthesis) {
      const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        w.__micCalls++;
        orig(u);
      };
    }
  });
  await page.goto(PAGE_URL);
  await play(page).click();
  await answer(page).click();
  await page.keyboard.type(challenge.digits, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  expect(await page.evaluate(() => (window as unknown as { __micCalls: number }).__micCalls)).toBe(0);
  await expect(page.getByTestId("audio-alternative")).toBeVisible();
  await expect(page.getByTestId("audio-alternative")).toHaveAttribute("href", /\/playground\/math-logic$/);
  await expect(page.locator("main")).not.toContainText(challenge.digits); // the digits are never shown as text
});

test("privacy: only the local clips are requested, nothing is stored, and key events never say which digit", async ({ page }) => {
  const clips: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".wav")) clips.push(r.url());
  });
  await page.goto(PAGE_URL);
  const assertNoDataLeft = await watchPrivacy(page, { allowRequests: [/\/audio\/digits\/\d\.wav$/] });
  await play(page).focus();
  await page.keyboard.press("Enter"); // keyboard only: every recorded event then has a key code
  await answer(page).focus();
  await page.keyboard.type(challenge.digits, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect.poll(() => clips.length).toBeGreaterThan(0);
  for (const u of clips) {
    const url = new URL(u);
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.pathname).toMatch(/\/audio\/digits\/\d\.wav$/);
  }
  await page.getByTestId("timeline-marker").first().click();
  const total = Number(/of (\d+)/.exec((await page.getByTestId("event-position").textContent()) ?? "")?.[1]);
  expect(total).toBeGreaterThan(challenge.digits.length);
  for (let i = 0; i < total; i++) {
    const code = (await page.getByTestId("event-field-code").textContent()) ?? "";
    const target = (await page.getByTestId("event-field-target").textContent()) ?? "";
    if (target === "audio-input") expect(code).toMatch(/^(Letter|Digit|Other|Backspace|Enter)$/);
    else {
      expect(target).toBe("audio-play");
      expect(code).toMatch(/^(Enter|Space)$/);
    }
    if (i < total - 1) await page.getByTestId("event-next").click();
  }
  await assertNoDataLeft();
});
