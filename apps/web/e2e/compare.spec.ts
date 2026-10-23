import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const SEED = 12345;
const challenge = registry.get("slider").generate({ rng: createRng(SEED) });

async function drag(page: Page, toPosition: number) {
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

test.beforeEach(async ({ page }) => {
  await page.goto(`/compare?seed=${SEED}`);
  await expect(page.getByTestId("slider-handle")).toBeVisible();
});

test("before an attempt: synthetic side is filled, human side is empty, no differences", async ({ page }) => {
  await expect(page.getByTestId("human-empty")).toBeVisible();
  await expect(cell(page, "human", "duration")).toHaveText("—");
  await expect(cell(page, "synthetic", "duration")).not.toHaveText("—");
  await expect(cell(page, "diff", "duration")).toHaveText("—");
  await expect(page.getByTestId("traj-synthetic")).toBeVisible();
});

test("after a drag both sides are filled; switching profile changes the synthetic side only", async ({ page }) => {
  await drag(page, challenge.target);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  const human = await cell(page, "human", "distance").textContent();
  expect(human).not.toBe("—");
  await expect(cell(page, "diff", "distance")).toHaveText(/^[+−±]/);

  await page.getByTestId("profile-eased").check();
  const eased = await cell(page, "synthetic", "maxVelocity").textContent();
  await page.getByTestId("profile-linear").check();
  const linear = await cell(page, "synthetic", "maxVelocity").textContent();
  expect(linear).not.toBe(eased);
  expect(await cell(page, "human", "distance").textContent()).toBe(human);

  await page.getByTestId("profile-noisy").check();
  await expect(cell(page, "synthetic", "overshoot")).not.toHaveText("—");
  const before = await cell(page, "synthetic", "distance").textContent();
  await page.getByTestId("regenerate").click();
  expect(await cell(page, "synthetic", "distance").textContent()).not.toBe(before);
});

test("wording: no verdict, no score; the page says what it does not claim", async ({ page }) => {
  await expect(page.getByTestId("compare-note")).toContainText("not a classification");
  await expect(page.getByTestId("compare-note")).toContainText("does not compute a bot score");
  const text = ((await page.getByTestId("compare-result").textContent()) ?? "").toLowerCase();
  expect(text).not.toContain("human-like");
  expect(text).not.toContain("suspicious");
});

test("privacy: no requests, console output or storage writes while comparing", async ({ page }) => {
  const assertNoDataLeft = await watchPrivacy(page);
  await drag(page, challenge.target);
  await page.getByTestId("profile-noisy").check();
  await page.getByTestId("regenerate").click();
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await assertNoDataLeft();
});

test("New challenge resets the human side", async ({ page }) => {
  await drag(page, challenge.target);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("human-empty")).toBeVisible();
  await expect(cell(page, "human", "duration")).toHaveText("—");
});
