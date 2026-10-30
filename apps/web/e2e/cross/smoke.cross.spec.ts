import { type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { generatePowChallenge, registry, searchNonces } from "@captchalab/captcha-plugins";
import { expect, test } from "../fixtures";

/**
 * Cross-browser smoke: the same functional checks in Chromium, Firefox and WebKit. It is deliberately not a copy of the
 * full suite: one short path through each representative page, asserting behavior (result, state, no crash, no
 * console error), never timings, pixels or audio output. Every test fails on a page error or a console error.
 */
test.beforeEach(({ page }, info) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  info.annotations.push({ type: "problems", description: "checked after the test" });
  (page as Page & { __problems?: string[] }).__problems = problems;
});
test.afterEach(({ page }) => {
  expect((page as Page & { __problems?: string[] }).__problems ?? [], "page errors / console errors").toEqual([]);
});

const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

// ---------------------------------------------------------------------------------------------------------- Slider
const SLIDER_SEED = 7;
const slider = registry.get("slider").generate({ rng: createRng(SLIDER_SEED), variantId: "classic", difficulty: "medium" });

test("Slider: the keyboard reaches the target and passes", async ({ page }) => {
  await page.goto(`/playground/slider?seed=${SLIDER_SEED}&variant=classic&difficulty=medium`);
  const handle = page.getByTestId("slider-handle");
  await handle.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < Math.round(slider.target * 100); i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("inspect")).toBeVisible();
});

test("Slider: a pointer drag is captured and released to a result", async ({ page }) => {
  await page.goto(`/playground/slider?seed=${SLIDER_SEED}&variant=classic&difficulty=medium`);
  const track = (await page.getByTestId("slider-track").boundingBox())!;
  const handle = (await page.getByTestId("slider-handle").boundingBox())!;
  const y = handle.y + handle.height / 2;
  await page.mouse.move(handle.x + handle.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.6, y + 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("result")).toBeVisible(); // pass or not, the drag must reach a verdict
  await expect(page.getByTestId("inspect")).toBeVisible();
});

// ----------------------------------------------------------------------------------------------------- Drag & Drop
const DD_SEED = 4242;
const dd = registry.get("drag-drop").generate({ rng: createRng(DD_SEED) });
const own = (itemId: string) => dd.targets.find((t) => t.acceptsItemId === itemId)!;

test("Drag & Drop: the whole challenge can be finished with the keyboard", async ({ page }) => {
  await page.goto(`/playground/drag-drop?seed=${DD_SEED}`);
  await expect(page.getByTestId("drag-status")).toContainText("0 of 3 shapes placed");
  for (const it of dd.items) {
    await page.getByTestId(`item-${it.id}`).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId(`item-${it.id}`)).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId(`drop-${own(it.id).id}`).focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId(`item-${it.id}`)).toHaveAttribute("data-placement", own(it.id).id);
  }
  await page.getByTestId("verify").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
});

test("Drag & Drop: a pointer drag with pointer capture places a shape", async ({ page }) => {
  await page.goto(`/playground/drag-drop?seed=${DD_SEED}`);
  const first = dd.items[0]!;
  await page.getByTestId("drag-surface").scrollIntoViewIfNeeded();
  const surface = (await page.getByTestId("drag-surface").boundingBox())!;
  const b = (await page.getByTestId(`item-${first.id}`).boundingBox())!;
  const to = { x: surface.x + own(first.id).position.x * surface.width, y: surface.y + own(first.id).position.y * surface.height };
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId(`item-${first.id}`)).toHaveAttribute("data-placement", own(first.id).id);
});

// --------------------------------------------------------------------------------------------------------------- Text
const TEXT_SEED = 31;
const text = registry.get("text").generate({ rng: createRng(TEXT_SEED) });

test("Text: typing the text passes and the typed letters are not kept", async ({ page }) => {
  await page.goto(`/playground/text?seed=${TEXT_SEED}`);
  await page.getByTestId("text-answer").click();
  await page.keyboard.type(text.text.toLowerCase(), { delay: 30 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(page.getByTestId("text-answer")).toHaveValue("");
  await expect(page.getByTestId("inspect")).not.toContainText(/Key[A-Z]/);
});

// -------------------------------------------------------------------------------------------------------------- Audio
const AUDIO_SEED = 9;
const audio = registry.get("audio").generate({ rng: createRng(AUDIO_SEED), variantId: "spoken-digits", difficulty: "easy" });

/**
 * Whether this browser build can actually start audio output: Web Audio exists AND a context reaches "running". Automation
 * builds differ: Playwright's WebKit on Windows has no Web Audio at all, and Firefox on a headless Linux runner has the API
 * but no audio device, so resume() never settles. Both are environments, not site bugs; the page must then say so.
 */
const hasWorkingAudio = (page: Page) =>
  page.evaluate(async () => {
    const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return false;
    try {
      const ctx = new Ctor();
      await Promise.race([ctx.resume().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
      const ok = ctx.state === "running";
      void ctx.close().catch(() => undefined);
      return ok;
    } catch {
      return false;
    }
  });

test("Audio: nothing plays on load; Play and Replay work; no microphone; the right digits pass", async ({ page }) => {
  const wavs: string[] = [];
  const micCalls: string[] = [];
  await page.exposeFunction("__micCall", (what: string) => void micCalls.push(what));
  await page.addInitScript(() => {
    // Any attempt to reach a microphone or ask for permission is recorded; the page must make none.
    const w = window as unknown as { __micCall: (w: string) => void };
    const md = navigator.mediaDevices as MediaDevices | undefined;
    if (md) {
      md.getUserMedia = () => {
        w.__micCall("getUserMedia");
        return Promise.reject(new Error("blocked in test"));
      };
      md.enumerateDevices = () => {
        w.__micCall("enumerateDevices");
        return Promise.resolve([]);
      };
    }
  });
  page.on("request", (r) => {
    if (r.url().endsWith(".wav")) wavs.push(r.url());
  });
  await page.goto(`/playground/audio?seed=${AUDIO_SEED}&variant=spoken-digits&difficulty=easy`);
  expect(wavs).toHaveLength(0); // no auto-play
  if (!(await hasWorkingAudio(page))) {
    // Without working audio output the page must say so, keep the alternative challenge and not hang on "Loading audio...".
    test.info().annotations.push({ type: "limitation", description: "this browser build cannot start audio output" });
    await page.getByTestId("audio-play").click();
    await expect(page.getByTestId("audio-error")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("audio-error")).toHaveAttribute("data-kind", /unsupported|unavailable/);
    await expect(page.getByTestId("audio-alternative")).toBeVisible();
    await expect(page.getByTestId("audio-play")).toBeEnabled();
    await expect(page.getByTestId("audio-status")).not.toContainText("Loading");
    expect(micCalls).toEqual([]);
    return;
  }
  await page.getByTestId("audio-play").click();
  await expect(page.getByTestId("audio-error")).toHaveCount(0);
  await expect.poll(() => wavs.length).toBeGreaterThan(0);
  await expect(page.getByTestId("audio-play")).toHaveText("Replay");
  await page.getByTestId("audio-play").click(); // Replay stops the first playback and starts again
  await expect(page.getByTestId("audio-error")).toHaveCount(0);
  await page.getByTestId("audio-answer").click();
  await page.keyboard.type(audio.digits, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "playCount")).toHaveText("2");
  expect(micCalls, "no microphone or device enumeration").toEqual([]);
});

test("Audio: when the audio device never starts (resume never settles) the page says so instead of hanging on Loading", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { AudioContext?: { prototype: object }; webkitAudioContext?: { prototype: object } };
    const proto = (w.AudioContext ?? w.webkitAudioContext)?.prototype;
    if (!proto) return;
    Object.defineProperty(proto, "state", { get: () => "suspended", configurable: true });
    (proto as { resume: () => Promise<void> }).resume = () => new Promise<void>(() => undefined);
  });
  await page.goto(`/playground/audio?seed=${AUDIO_SEED}&variant=spoken-digits&difficulty=easy`);
  const apiExists = await page.evaluate(() => typeof (window as unknown as { AudioContext?: unknown }).AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== "undefined");
  await page.getByTestId("audio-play").click();
  await expect(page.getByTestId("audio-error")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("audio-error")).toHaveAttribute("data-kind", apiExists ? "unavailable" : "unsupported");
  await expect(page.getByTestId("audio-status")).not.toContainText("Loading");
  await expect(page.getByTestId("audio-alternative")).toBeVisible();
  await expect(page.getByTestId("audio-play")).toBeEnabled();
});

test("Audio: changing the difficulty during playback resets the session and stops the sound", async ({ page }) => {
  await page.goto(`/playground/audio?seed=${AUDIO_SEED}&variant=spoken-digits&difficulty=easy`);
  await page.getByTestId("audio-play").click();
  await page.getByTestId("difficulty-medium").click();
  await expect(page.getByTestId("audio-play")).toHaveText("Play");
  await expect(page.getByTestId("audio-play")).toHaveAttribute("data-playing", "false");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

// ------------------------------------------------------------------------------------------------------------ Memory
const memory = registry.get("memory").generate({ rng: createRng(21), variantId: "sequence", difficulty: "easy" });

test("Memory: the preview timer ends, recall opens and the right order passes", async ({ page }) => {
  if (memory.kind !== "sequence") throw new Error("expected a sequence challenge");
  await page.goto("/playground/memory?seed=21&variant=sequence&difficulty=easy");
  await page.getByTestId("mem-start").click();
  await expect(page.getByTestId("mem-preview-status")).toBeVisible();
  await expect(page.getByTestId("verify")).toBeVisible({ timeout: 15_000 });
  for (const id of memory.sequence) await page.getByTestId(`option-${id}`).click();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
});

// ------------------------------------------------------------------------------------------- Proof of Work / Space
test("Proof of Work: Start completes; Cancel on a long hard run stops it with no stale completion", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/playground/proof-of-work?seed=3&variant=hash-prefix&difficulty=easy");
  await page.getByTestId("pow-start").click();
  await expect(page.getByTestId("result")).toContainText("Passed", { timeout: 20_000 });

  let seed = 0;
  for (; seed <= 60; seed++) {
    const c = generatePowChallenge({ rng: createRng(seed), variantId: "hash-prefix", difficulty: "hard" });
    if (searchNonces(c, 0, 150000) === null) break;
  }
  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await page.getByTestId("pow-start").click();
  await page.getByTestId("pow-cancel").click();
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "cancelled");
  await page.waitForTimeout(1000);
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

test("Proof of Space: Start completes; Cancel stops a stretched 4 MB run and nothing completes afterwards", async ({ page }) => {
  await page.goto("/playground/proof-of-space?seed=5&variant=sampled&difficulty=easy");
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("result")).toContainText("Passed");

  await page.goto("/playground/proof-of-space?seed=5&variant=checksum&difficulty=hard");
  await expect(page.getByTestId("pos-start")).toBeEnabled();
  await page.evaluate(() => {
    const origNow = performance.now.bind(performance);
    performance.now = () => origNow() * 100;
    const origSet = window.setTimeout.bind(window);
    (window as unknown as { setTimeout: unknown }).setTimeout = (fn: TimerHandler, ms?: number, ...args: unknown[]) => origSet(fn, ms === 0 ? 100 : ms, ...args);
  });
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "running");
  await page.getByTestId("pos-cancel").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "cancelled");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

// ----------------------------------------------------------------------------------- Hybrid / Browser Capability
test("Hybrid: stage 2 unlocks once the proof of work is valid", async ({ page }) => {
  await page.goto("/playground/hybrid?kind=pow-visual&seed=41");
  await expect(page.getByTestId("stage-child-locked")).toBeVisible();
  await page.getByTestId("stage-pow").getByTestId("pow-start").click();
  await expect(page.getByTestId("stage-pow").getByTestId("result")).toContainText("Passed", { timeout: 20_000 });
  await expect(page.getByTestId("stage-child-locked")).toHaveCount(0);
  await expect(page.getByTestId("hybrid-verdict")).toHaveAttribute("data-reason", "child-missing");
});

test("Browser Capability: booleans only, no timing, no crash", async ({ page }) => {
  await page.goto("/playground/browser-capability?seed=3&variant=extended&difficulty=easy");
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("inspect")).toBeVisible();
  await expect(page.getByTestId("bc-checks").locator("li")).toHaveCount(7);
  for (const id of ["probeTime", "computeTime"]) await expect(metric(page, id)).toHaveCount(0);
  await expect(page.getByTestId("inspect")).not.toContainText(/\d\s?ms/);
});

test("Browser Capability: an API that is missing is reported as not available, never crashes", async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["Worker", "AudioContext", "webkitAudioContext", "PointerEvent"]) Object.defineProperty(window, name, { value: undefined, configurable: true });
  });
  await page.goto("/playground/browser-capability?seed=3&variant=extended&difficulty=easy");
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
  for (const id of ["worker", "webaudio", "pointer"]) await expect(page.getByTestId(`bc-check-${id}`)).toHaveAttribute("data-available", "false");
});

// ----------------------------------------------------------------------------------------- Dataset and Evaluation
test("Evaluation: an empty dataset says so; Dataset and Evaluation pages render and link to each other", async ({ page }) => {
  await page.goto("/experiments/evaluation");
  await expect(page.getByTestId("experiments-nav-evaluation")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main")).toContainText("No eligible labeled sessions");
  await page.getByTestId("experiments-nav-dataset").click();
  await expect(page).toHaveURL(/experiments\/dataset/);
  await expect(page.locator("main")).toBeVisible();
});

test("Dataset: a file chosen for import is read locally and a bad file is rejected without a crash", async ({ page }) => {
  await page.goto("/experiments/dataset");
  await page.getByTestId("ds-import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"not":"a dataset"}') });
  await expect(page.getByTestId("ds-notice")).toBeVisible(); // a rejected file explains itself
  await expect(page.getByText(/Application error|TypeError/)).toHaveCount(0);
});

// ---------------------------------------------------------------------------------------- MatchKey and Tile Game
// The default variant and difficulty are used on purpose: the page is opened with only a seed, and the same generator call
// (no variant given) makes the same challenge, so the test does not depend on the UI to learn the answer.
const MT_SEED = 31;
const matchKey = registry.get("match-key").generate({ rng: createRng(MT_SEED) });
const tileGame = registry.get("tile-game").generate({ rng: createRng(MT_SEED) });

test("MatchKey (default variant): select the matching option, Verify, Passed; a new challenge is usable", async ({ page }) => {
  await page.goto(`/playground/match-key?seed=${MT_SEED}`);
  await expect(page.getByTestId("match-key")).toBeVisible();
  await page.getByTestId(`option-${matchKey.correctId}`).click();
  await expect(page.getByTestId(`option-${matchKey.correctId}`)).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("verify")).toBeVisible();
});

test("Tile Game (default variant): select the required tiles, Verify, Passed; a new challenge is usable", async ({ page }) => {
  await page.goto(`/playground/tile-game?seed=${MT_SEED}`);
  await expect(page.getByTestId("tile-game")).toBeVisible();
  for (const id of tileGame.answerIds) await page.getByTestId(`tile-${id}`).click();
  await expect(page.getByTestId("tile-status")).toContainText(`${tileGame.required} of ${tileGame.required}`);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("verify")).toBeVisible();
});
