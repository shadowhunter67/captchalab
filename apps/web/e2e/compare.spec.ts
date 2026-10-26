import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

// Slider Compare: the original flow, kept working inside the multi-CAPTCHA Compare page.
const SEED = 12345;
const challenge = registry.get("slider").generate({ rng: createRng(SEED) });

async function drag(page: Page, toPosition: number) {
  await page.getByTestId("slider-track").scrollIntoViewIfNeeded(); // the setup panel sits above the slider
  const track = await page.getByTestId("slider-track").boundingBox();
  const handle = await page.getByTestId("slider-handle").boundingBox();
  if (!track || !handle) throw new Error("slider not rendered");
  const travel = track.width - handle.width;
  const startX = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  const xAt = (p: number) => track.x + handle.width / 2 + p * travel;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(xAt(toPosition * 0.6), y + 3, { steps: 8 });
  await page.mouse.move(xAt(toPosition), y, { steps: 8 });
  await page.mouse.up();
}

const cell = (page: Page, side: "human" | "synthetic" | "diff", dim: string) => page.getByTestId(`${side}-${dim}`);
const generate = (page: Page) => page.getByTestId("generate").click();

test.beforeEach(async ({ page }) => {
  await page.goto(`/compare?seed=${SEED}`);
  await expect(page.getByTestId("slider-handle")).toBeVisible();
});

test("Slider is the default CAPTCHA; nothing is compared until Generate comparison", async ({ page }) => {
  await expect(page.getByTestId("captcha-select")).toHaveValue("slider");
  await expect(page.getByTestId("compare-pending")).toBeVisible();
  await expect(page.getByTestId("compare-table")).toHaveCount(0);
});

test("before an attempt: synthetic side is filled, human side is empty, no differences", async ({ page }) => {
  await generate(page);
  await expect(page.getByTestId("human-empty")).toBeVisible();
  await expect(cell(page, "human", "completionTime")).toHaveText("—");
  await expect(cell(page, "synthetic", "completionTime")).not.toHaveText("—");
  await expect(cell(page, "diff", "completionTime")).toHaveText("—");
  await expect(page.getByTestId("traj-synthetic")).toBeVisible();
  await expect(page.getByTestId("class-human-empty")).toBeVisible();
});

test("after a drag both sides are filled; switching profile changes the synthetic side only", async ({ page }) => {
  await drag(page, challenge.target);
  await generate(page);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  const human = await cell(page, "human", "pointerDistance").textContent();
  expect(human).not.toBe("—");
  await expect(cell(page, "diff", "pointerDistance")).toHaveText(/^[+−±]/);

  await page.getByTestId("profile-eased").check();
  const eased = await cell(page, "synthetic", "maxVelocity").textContent();
  await page.getByTestId("profile-linear").check();
  const linear = await cell(page, "synthetic", "maxVelocity").textContent();
  expect(linear).not.toBe(eased);
  expect(await cell(page, "human", "pointerDistance").textContent()).toBe(human);

  await page.getByTestId("profile-noisy").check();
  await expect(cell(page, "synthetic", "overshoot")).not.toHaveText("—");
  const before = await cell(page, "synthetic", "pointerDistance").textContent();
  await page.getByTestId("regenerate").click();
  expect(await cell(page, "synthetic", "pointerDistance").textContent()).not.toBe(before);

  await page.getByTestId("profile-stop-and-correct").check();
  await expect(cell(page, "synthetic", "corrections")).toHaveText("1");
});

test("wording: the differences are not a verdict; the classifier sits apart and is labelled experimental", async ({ page }) => {
  await generate(page);
  await expect(page.getByTestId("compare-note")).toContainText("not a classification");
  await expect(page.getByTestId("compare-note")).toContainText("does not compute a bot score");
  const text = ((await page.getByTestId("compare-result").textContent()) ?? "").toLowerCase();
  expect(text).not.toContain("human-like");
  expect(text).not.toContain("suspicious");
  const classification = (await page.getByTestId("behavior-classification").textContent()) ?? "";
  expect(classification).toContain("Experimental classification for CaptchaLab lab data only. This result does not prove whether a real user is human or automated.");
  expect(classification).not.toMatch(/\d\s*%/);
  expect(classification.toLowerCase()).not.toMatch(/\bbot\b/);
});

test("privacy: no requests, console output or storage writes while comparing", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await drag(page, challenge.target);
  await generate(page);
  await page.getByTestId("profile-noisy").check();
  await page.getByTestId("regenerate").click();
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await assertNoDataLeft();
});

test("New challenge resets the human side and the comparison", async ({ page }) => {
  await drag(page, challenge.target);
  await generate(page);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("compare-pending")).toBeVisible();
  await expect(page.getByTestId("traj-human")).toHaveCount(0);
  await generate(page);
  await expect(page.getByTestId("human-empty")).toBeVisible();
  await expect(cell(page, "human", "completionTime")).toHaveText("—");
});
