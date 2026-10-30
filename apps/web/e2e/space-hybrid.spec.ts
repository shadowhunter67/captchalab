import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 41;
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);
const childSeed = (SEED ^ 0x9e3779b1) >>> 0;
const slider = registry.get("slider").generate({ rng: createRng(childSeed), difficulty: "medium" });
const audio = registry.get("audio").generate({ rng: createRng(childSeed), difficulty: "easy" });

test("Proof of Space: Start runs to a valid proof with computation metrics; privacy holds", async ({ page }) => {
  await page.goto(`/playground/proof-of-space?seed=${SEED}&variant=sampled&difficulty=easy`);
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle"); // nothing runs on load
  const assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "allocatedBytes")).toHaveText("256 KB");
  await expect(metric(page, "attemptCount")).toHaveText("1");
  await expect(metric(page, "fillTime")).not.toHaveText("—");
  await expect(page.getByTestId("computation-disclaimer")).toContainText("does not prove a human user");
  await expect(page.getByTestId("pos-start")).toBeDisabled(); // one run per challenge
  await assertNoDataLeft();
});

test("Proof of Space: the checksum variant passes too", async ({ page }) => {
  await page.goto(`/playground/proof-of-space?seed=${SEED}&variant=checksum&difficulty=medium`);
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(metric(page, "allocatedBytes")).toHaveText("1 MB");
});

test("Proof of Space: Cancel stops the run, shows no result, and New challenge starts clean", async ({ page }) => {
  await page.goto(`/playground/proof-of-space?seed=${SEED}&variant=checksum&difficulty=hard`);
  await expect(page.getByTestId("pos-start")).toBeEnabled(); // hydrated before the CPU is slowed
  // The runner works in time-boxed slices and yields between them. Running the page's clock fast makes each slice end
  // after a chunk or two, and the stretched yields make the 4 MB run last seconds: it can always be cancelled mid-run,
  // on any machine, while the page itself (hydration, clicks) stays at full speed.
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
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("pos-cancel")).toBeDisabled();
  await page.waitForTimeout(500); // a stale run must not complete afterwards
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "cancelled");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await page.getByTestId("pos-new").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
});

async function solvePow(page: Page): Promise<void> {
  await page.getByTestId("stage-pow").getByTestId("pow-start").click();
  await expect(page.getByTestId("stage-pow").getByTestId("pow-status")).toHaveAttribute("data-state", "done");
}

test("Hybrid PoW + Visual: stage 2 is locked until PoW is valid; a wrong slider fails the whole; then both valid pass", async ({ page }) => {
  await page.goto(`/playground/hybrid?kind=pow-visual&seed=${SEED}`);
  const verdict = page.getByTestId("hybrid-verdict");
  await expect(page.getByTestId("stage-child-locked")).toBeVisible();
  await expect(verdict).toHaveAttribute("data-passed", "false");
  await expect(verdict).toHaveAttribute("data-reason", "pow-missing");
  await solvePow(page);
  await expect(page.getByTestId("stage-child-locked")).toHaveCount(0);
  await expect(verdict).toHaveAttribute("data-reason", "child-missing");

  const handle = page.getByTestId("stage-child").getByTestId("slider-handle");
  await handle.focus();
  await page.keyboard.press(slider.target > 0.5 ? "Home" : "End"); // the far side: wrong on purpose
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stage-child").getByTestId("result")).toContainText("Not passed");
  await expect(verdict).toHaveAttribute("data-passed", "false");
  await expect(verdict).toHaveAttribute("data-reason", "child-failed");

  await page.getByRole("button", { name: "Try again (same challenge)" }).click();
  await expect(verdict).toHaveAttribute("data-reason", "child-missing"); // clearing the attempt clears its outcome
  await handle.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < Math.round(slider.target * 100); i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stage-child").getByTestId("result")).toContainText("Passed");
  await expect(verdict).toHaveAttribute("data-passed", "true");
  await expect(page.getByTestId("hybrid-result")).toHaveText("Both stages passed");
  // Computation and interaction numbers stay in their own stage.
  await expect(page.getByTestId("stage-pow").getByTestId("metric-iterations")).toBeVisible();
  await expect(page.getByTestId("stage-child").getByTestId("metric-iterations")).toHaveCount(0);
});

test("Hybrid PoW + Audio: wrong digits fail the whole; right digits pass; no extra network beyond the clips", async ({ page }) => {
  await page.goto(`/playground/hybrid?kind=pow-audio&seed=${SEED}`);
  const assertNoDataLeft = await watchPrivacy(page, { allowRequests: [/\/audio\/digits\/\d\.wav$/] });
  const verdict = page.getByTestId("hybrid-verdict");
  await solvePow(page);
  const child = page.getByTestId("stage-child");
  const wrong = audio.digits.slice(0, -1) + String((Number(audio.digits.at(-1)) + 1) % 10);
  await child.getByTestId("audio-answer").click();
  await page.keyboard.type(wrong, { delay: 20 });
  await child.getByTestId("verify").click();
  await expect(child.getByTestId("result")).toContainText("Not passed");
  await expect(verdict).toHaveAttribute("data-reason", "child-failed");
  await child.getByTestId("audio-answer").fill("");
  await child.getByTestId("audio-answer").click();
  await page.keyboard.type(audio.digits, { delay: 20 });
  await child.getByTestId("verify").click();
  await expect(verdict).toHaveAttribute("data-passed", "true");
  await assertNoDataLeft();
});

test("Hybrid: New challenge resets both stages", async ({ page }) => {
  await page.goto(`/playground/hybrid?kind=pow-visual&seed=${SEED}`);
  await solvePow(page);
  await expect(page.getByTestId("stage-child-locked")).toHaveCount(0);
  await page.getByTestId("hybrid-new").click();
  await expect(page.getByTestId("stage-child-locked")).toBeVisible();
  await expect(page.getByTestId("hybrid-verdict")).toHaveAttribute("data-reason", "pow-missing");
});
