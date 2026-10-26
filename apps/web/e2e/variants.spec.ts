import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const cfg = (page: Page, id: string) => page.getByTestId(`config-${id}`);
const level = (page: Page, d: "easy" | "medium" | "hard") => page.getByTestId(`difficulty-${d}`);

async function dragSlider(page: Page, to: number) {
  const track = (await page.getByTestId("slider-track").boundingBox())!;
  const handle = (await page.getByTestId("slider-handle").boundingBox())!;
  const travel = track.width - handle.width;
  const y = handle.y + handle.height / 2;
  await page.mouse.move(handle.x + handle.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(track.x + handle.width / 2 + to * travel, y, { steps: 10 });
  await page.mouse.up();
}

test("slider: Easy -> Hard makes a new challenge, narrows the window and discards the session", async ({ page }) => {
  await page.goto("/playground/slider?seed=12345&variant=classic&difficulty=easy");
  await expect(level(page, "easy")).toHaveAttribute("aria-pressed", "true");
  const bandEasy = (await page.getByTestId("slider-tolerance").boundingBox())!.width;
  await dragSlider(page, 0.5);
  await expect(page.getByTestId("inspect")).toBeVisible();
  await expect(cfg(page, "tolerance")).toContainText("±4%");

  await level(page, "hard").click();
  await expect(level(page, "hard")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("inspect")).toHaveCount(0); // nothing recorded carries over
  const bandHard = (await page.getByTestId("slider-tolerance").boundingBox())!.width;
  expect(bandHard).toBeLessThan(bandEasy / 2);
  await expect(page).toHaveURL(/difficulty=hard/);
  await expect(page).toHaveURL(/seed=12345/);
  await dragSlider(page, 0.5);
  await expect(cfg(page, "tolerance")).toContainText("±1.2%");
  await expect(cfg(page, "difficulty")).toHaveText("Hard");
});

test("slider: the Precision variant is narrower than Classic at the same level", async ({ page }) => {
  await page.goto("/playground/slider?seed=7&variant=classic&difficulty=medium");
  const classic = (await page.getByTestId("slider-tolerance").boundingBox())!.width;
  await page.getByTestId("variant-select").selectOption("precision");
  const precision = (await page.getByTestId("slider-tolerance").boundingBox())!.width;
  expect(precision).toBeLessThan(classic);
  await expect(page.getByTestId("variant-description")).toContainText("narrow target");
});

test("text: Clean -> Noisy changes the drawn noise and the configuration", async ({ page }) => {
  await page.goto("/playground/text?seed=31&variant=clean&difficulty=medium");
  const lines = page.getByTestId("text-image").locator("line");
  await expect(lines).toHaveCount(1);
  await page.getByTestId("variant-select").selectOption("noisy");
  await expect(lines).toHaveCount(12);
  await page.getByTestId("text-answer").fill("abc");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "variant")).toHaveText("Noisy");
  await expect(cfg(page, "noiseLines")).toHaveText("12");
  await expect(cfg(page, "length")).toHaveText("6");
  await page.getByTestId("difficulty-easy").click();
  await expect(page.getByTestId("text-image").locator("text")).toHaveCount(5);
  await expect(lines).toHaveCount(8);
});

test("image grid: difficulty changes how many cells match; the similar-shapes variant draws oval and rounded tiles", async ({ page }) => {
  await page.goto("/playground/image-grid?seed=17&variant=basic-shapes&difficulty=easy");
  await expect(page.getByTestId("image-grid")).toBeVisible();
  await page.getByTestId("verify").click();
  await expect(cfg(page, "targets")).toHaveText("2–3 / 9");
  await level(page, "hard").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await page.getByTestId("verify").click();
  await expect(cfg(page, "targets")).toHaveText("3–5 / 9");
  await page.getByTestId("variant-select").selectOption("similar-shapes");
  const labels = await page.getByTestId("image-grid").getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  expect(labels.every((l) => /circle|oval|square|rounded/.test(l))).toBe(true);
});

test("rotation: difficulty changes the tolerance and the start", async ({ page }) => {
  await page.goto("/playground/rotation?seed=99&variant=classic&difficulty=easy");
  await expect(page.getByTestId("rotation-object")).toBeVisible();
  await page.getByTestId("verify").click();
  await expect(cfg(page, "toleranceDeg")).toHaveText("±20°");
  await level(page, "hard").click();
  await page.getByTestId("verify").click();
  await expect(cfg(page, "toleranceDeg")).toHaveText("±6°");
  await page.getByTestId("variant-select").selectOption("offset-start");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "start")).toHaveText("140°–180°");
});

test("drag & drop: difficulty is listed in the configuration", async ({ page }) => {
  await page.goto("/playground/drag-drop?seed=4242&difficulty=hard&variant=shape-match");
  await expect(page.getByTestId("drag-surface")).toBeVisible();
  const challenge = registry.get("drag-drop").generate({ rng: createRng(4242), variantId: "shape-match", difficulty: "hard" });
  for (const item of challenge.items) {
    await page.getByTestId("drag-surface").scrollIntoViewIfNeeded();
    const board = (await page.getByTestId("drag-surface").boundingBox())!;
    const box = (await page.getByTestId(`item-${item.id}`).boundingBox())!;
    const target = challenge.targets.find((t) => t.acceptsItemId === item.id)!.position;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(board.x + target.x * board.width, board.y + target.y * board.height, { steps: 10 });
    await page.mouse.up();
  }
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expect(cfg(page, "dropTolerance")).toHaveText("10%");
  await expect(cfg(page, "itemSize")).toHaveText("15%");
});

test("checkbox: a single level; the other levels are disabled", async ({ page }) => {
  await page.goto("/playground/checkbox?seed=3");
  await expect(level(page, "medium")).toBeEnabled();
  await expect(level(page, "easy")).toBeDisabled();
  await expect(level(page, "hard")).toBeDisabled();
  await page.getByTestId("checkbox-label").click();
  await expect(cfg(page, "difficulty")).toHaveText("Medium");
  await expect(cfg(page, "activation")).toHaveText("single press");
});

test("same seed + variant + difficulty give the same challenge; New challenge keeps the choice", async ({ page }) => {
  const url = "/playground/text?seed=555&variant=noisy&difficulty=hard";
  await page.goto(url);
  const first = await page.getByTestId("text-image").innerHTML();
  await page.goto(url);
  expect(await page.getByTestId("text-image").innerHTML()).toBe(first);

  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("variant-select")).toHaveValue("noisy");
  await expect(level(page, "hard")).toHaveAttribute("aria-pressed", "true");
  expect(await page.getByTestId("text-image").innerHTML()).not.toBe(first);
  await expect(page.getByTestId("seed-input")).not.toHaveValue("555");
});

test("seed box: typing a seed and applying it reproduces that challenge", async ({ page }) => {
  await page.goto("/playground/image-grid?seed=17&variant=basic-shapes&difficulty=medium");
  const before = await page.getByTestId("image-grid").innerHTML();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("seed-input")).not.toHaveValue("17");
  await page.getByTestId("seed-input").fill("17");
  await page.getByTestId("seed-apply").click();
  expect(await page.getByTestId("image-grid").innerHTML()).toBe(before);
  await page.getByTestId("seed-input").fill("abc");
  await expect(page.getByTestId("seed-apply")).toBeDisabled();
});

test("an unknown variant or level in the URL falls back to the default", async ({ page }) => {
  await page.goto("/playground/slider?seed=1&variant=nope&difficulty=extreme");
  await expect(page.getByTestId("variant-select")).toHaveValue("classic");
  await expect(level(page, "medium")).toHaveAttribute("aria-pressed", "true");
});

test("compare: the human and synthetic sides share the chosen slider configuration", async ({ page }) => {
  await page.goto("/compare?seed=12345&variant=precision&difficulty=hard");
  await expect(page.getByTestId("variant-select")).toHaveValue("precision");
  await expect(cfg(page, "variant")).toHaveText("Precision");
  await expect(cfg(page, "difficulty")).toHaveText("Hard");
  await expect(cfg(page, "tolerance")).toContainText("±1%");
  await expect(page.getByTestId("compare-same-config")).toContainText("same challenge configuration");
  await level(page, "easy").click();
  await expect(cfg(page, "difficulty")).toHaveText("Easy");
  await expect(page.getByTestId("compare-pending")).toBeVisible(); // a new configuration starts with nothing generated
});

test("playground index and Learn describe the variants", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByTestId("variants-count-text")).toContainText("3 variants · 3 difficulty levels");
  await expect(page.getByTestId("variants-count-checkbox")).toContainText("1 variant · 1 difficulty level");
  await page.goto("/learn");
  await expect(page.getByTestId("variants-text")).toContainText("Clean");
  await expect(page.getByTestId("learn-slider").getByRole("heading", { name: "Variants & difficulty" })).toBeVisible();
});

test("privacy: changing variant, difficulty and seed writes nothing and sends nothing", async ({ page }) => {
  await page.goto("/playground/text?seed=5");
  const assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("variant-select").selectOption("rotated");
  await level(page, "hard").click();
  await page.getByTestId("seed-input").fill("77");
  await page.getByTestId("seed-apply").click();
  await page.getByTestId("text-answer").fill("zzz");
  await page.getByTestId("verify").click();
  await expect(cfg(page, "seed")).toHaveText("77");
  await assertNoDataLeft();
});
