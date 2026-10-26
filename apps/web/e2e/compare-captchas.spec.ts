import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { VARIANT_SETS, expectedSelection, registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const generate = (page: Page) => page.getByTestId("generate").click();
const label = (page: Page, side: "human" | "synthetic") => page.getByTestId(`class-${side}-label`);
const cell = (page: Page, side: "human" | "synthetic" | "diff", signal: string) => page.getByTestId(`${side}-${signal}`);
const LABELS = ["human-like", "synthetic-like", "uncertain"];

async function expectClassified(page: Page) {
  await expect(label(page, "human")).toBeVisible();
  await expect(label(page, "synthetic")).toBeVisible();
  expect(LABELS).toContain(await label(page, "human").getAttribute("data-label"));
  expect(LABELS).toContain(await label(page, "synthetic").getAttribute("data-label"));
  await expect(page.getByTestId("class-synthetic-evidence").locator("li").first()).toBeVisible();
  await expect(page.getByTestId("class-synthetic-version")).toContainText("behavioral-baseline@1");
  await expect(page.getByTestId("classifier-disclaimer")).toContainText("does not prove whether a real user is human or automated");
}

test("the selector offers exactly the six supported CAPTCHAs", async ({ page }) => {
  await page.goto("/compare");
  await expect(page.getByTestId("captcha-select").locator("option").first()).toHaveText("Slider"); // language applied
  const options = await page.getByTestId("captcha-select").locator("option").allTextContents();
  expect(options).toHaveLength(6);
  ["Slider", "Drag", "Checkbox", "Image", "Text", "Rotation"].forEach((name, i) => expect(options[i]).toContain(name));
  for (const unsupported of ["Memory", "Audio", "Proof", "Sequence", "Math", "Shape"]) expect(options.join("|")).not.toContain(unsupported);
});

test("checkbox: human click, generated comparison, timing view, signals and classification", async ({ page }) => {
  await page.goto("/compare?captcha=checkbox&seed=777");
  await page.getByTestId("checkbox-input").click();
  await generate(page);
  await expect(page.getByTestId("timeline-human")).toBeVisible();
  await expect(page.getByTestId("timeline-synthetic")).toBeVisible();
  await expect(page.getByTestId("traj-human")).toHaveCount(0); // no path to draw for a checkbox
  await expect(cell(page, "human", "reactionTime")).toHaveText(/ms$|s$/);
  await expect(cell(page, "synthetic", "pressDuration")).toHaveText(/ms$/);
  await expect(cell(page, "diff", "reactionTime")).toHaveText(/^[+−±]/);
  await expect(page.getByTestId("group-timing")).toBeVisible();
  await expect(page.getByTestId("synthetic-meta")).toContainText("synthetic@1");
  await expect(page.getByTestId("synthetic-meta")).toContainText("Delayed");
  await expectClassified(page);

  // The uncertain zone is reachable: strong regular rhythm against human-like reaction and press.
  await page.getByTestId("profile-regular-timing").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "uncertain");
  await page.getByTestId("profile-immediate").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
});

test("text: typed answer, synthetic typing profiles, rhythm signals", async ({ page }) => {
  const challenge = registry.get("text").generate({ rng: createRng(31) });
  await page.goto("/compare?captcha=text&seed=31");
  await page.getByTestId("text-answer").click();
  await page.keyboard.type(challenge.text.toLowerCase(), { delay: 60 });
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(page.getByTestId("timeline-human")).toBeVisible();
  await expect(cell(page, "human", "interKeyMean")).toHaveText(/ms$/);
  await expect(cell(page, "synthetic", "interKeyCv")).not.toHaveText("—");
  await expectClassified(page);
  await page.getByTestId("profile-uniform-typing").check();
  await expect(cell(page, "synthetic", "interKeyCv")).toHaveText("0.00");
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
  await expect(page.getByTestId("observations")).toBeVisible();
  // The typed text is neither in the page's result areas nor in the answer field once passed.
  const shown = (await page.getByTestId("compare-result").textContent()) ?? "";
  expect(shown.toLowerCase()).not.toContain(challenge.text.toLowerCase());
});

test("image grid: selections, repeated-click rhythm", async ({ page }) => {
  const challenge = registry.get("image-grid").generate({ rng: createRng(17) });
  await page.goto("/compare?captcha=image-grid&seed=17");
  for (const id of expectedSelection(challenge)) await page.getByTestId(`cell-${id}`).click();
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(page.getByTestId("timeline-synthetic")).toBeVisible();
  await expect(cell(page, "human", "activationCount")).toHaveText(String(expectedSelection(challenge).length));
  await expect(cell(page, "synthetic", "activationCount")).toHaveText(String(expectedSelection(challenge).length));
  await expectClassified(page);
  await page.getByTestId("profile-immediate").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
});

test("drag & drop: trajectories of both samples over the same board", async ({ page }) => {
  const challenge = registry.get("drag-drop").generate({ rng: createRng(4242) });
  await page.goto("/compare?captcha=drag-drop&seed=4242");
  const surface = page.getByTestId("drag-surface");
  await surface.scrollIntoViewIfNeeded();
  for (const item of challenge.items) {
    const box = (await surface.boundingBox())!;
    const from = (await page.getByTestId(`item-${item.id}`).boundingBox())!;
    const target = challenge.targets.find((t) => t.acceptsItemId === item.id)!;
    const to = { x: box.x + target.position.x * box.width, y: box.y + target.position.y * box.height };
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move((from.x + from.width / 2 + to.x) / 2, (from.y + from.height / 2 + to.y) / 2 - 5, { steps: 6 });
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
  }
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await expect(page.getByTestId("traj-synthetic")).toBeVisible();
  await expect(cell(page, "human", "attemptCount")).toHaveText("3");
  await expect(cell(page, "synthetic", "attemptCount")).toHaveText("3");
  await expect(cell(page, "synthetic", "dragDurationMean")).not.toHaveText("—");
  await expectClassified(page);
  await page.getByTestId("profile-direct").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
});

test("rotation: angular trajectories; the synthetic turn uses the human's object centre", async ({ page }) => {
  const challenge = registry.get("rotation").generate({ rng: createRng(99) });
  await page.goto("/compare?captcha=rotation&seed=99");
  const obj = page.getByTestId("rotation-object");
  await obj.scrollIntoViewIfNeeded();
  const b = (await obj.boundingBox())!;
  const c = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const turn = ((((-challenge.initialAngle + 180) % 360) + 360) % 360) - 180;
  const at = (deg: number) => ({ x: c.x + 80 * Math.cos((deg * Math.PI) / 180), y: c.y + 80 * Math.sin((deg * Math.PI) / 180) });
  await page.mouse.move(at(0).x, at(0).y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) {
    const p = at((turn * i) / 14);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(15);
  }
  await page.mouse.up();
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(page.getByTestId("traj-human")).toBeVisible();
  await expect(page.getByTestId("traj-synthetic")).toBeVisible();
  await expect(cell(page, "human", "finalAngularError")).toHaveText(/°$/);
  await expect(cell(page, "synthetic", "finalAngularError")).toHaveText(/°$/);
  await expectClassified(page);
  await page.getByTestId("profile-direct").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
});

test("the same challenge configuration is shown for both samples; changing it resets everything", async ({ page }) => {
  await page.goto("/compare?captcha=text&seed=31&variant=noisy&difficulty=hard");
  await expect(page.getByTestId("variant-select")).toHaveValue("noisy");
  await expect(page.getByTestId("config-variant")).toHaveText("Noisy");
  await expect(page.getByTestId("config-seed")).toHaveText("31");
  await expect(page.getByTestId("compare-same-config")).toContainText("same challenge configuration");
  await generate(page);
  await expect(label(page, "synthetic")).toBeVisible();
  await page.getByTestId("variant-select").selectOption("clean");
  await expect(page.getByTestId("compare-pending")).toBeVisible();
  await expect(page.getByTestId("behavior-classification")).toHaveCount(0);
  await expect(page.getByTestId("config-variant")).toHaveText("Clean");
});

test("switching CAPTCHA starts clean: other CAPTCHA's seed and variant are dropped from the URL", async ({ page }) => {
  await page.goto("/compare?seed=5&variant=precision&difficulty=hard");
  await page.getByTestId("captcha-select").selectOption("text");
  await expect(page).toHaveURL(/captcha=text/);
  await expect(page).not.toHaveURL(/variant=precision/);
  await expect(page.getByTestId("text-answer")).toBeVisible();
  await expect(page.getByTestId("compare-pending")).toBeVisible();
  await expect(page.getByTestId("variant-select")).toHaveValue(VARIANT_SETS.text.defaultSelection.variantId);
});

test("synthetic reference distribution and the evaluation panel run on request", async ({ page }) => {
  await page.goto("/compare?captcha=checkbox&seed=777");
  await generate(page);
  await expect(page.getByTestId("distribution")).toHaveCount(0);
  await page.getByTestId("profile-regular-timing").check();
  await page.getByTestId("distribution-generate").click();
  await expect(page.getByTestId("distribution")).toContainText("30 runs");
  await expect(page.getByText("Generated synthetic reference distribution")).toBeVisible();
  await expect(page.getByTestId("distribution-constant")).toBeVisible();
  await expect(page.getByTestId("dist-pressDuration")).toBeVisible();

  await expect(page.getByTestId("evaluation-experimental")).toHaveText("This classifier is experimental.");
  await page.getByTestId("evaluation-run").click();
  for (const p of ["immediate", "delayed", "regular-timing"]) await expect(page.getByTestId(`reading-${p}`)).toBeVisible();
  await expect(page.getByTestId("reading-regular-timing")).toContainText("Uncertain");
  await expect(page.getByTestId("reading-immediate")).toContainText("Synthetic-like");
  await expect(page.getByText(/accuracy figure or population confusion matrix/)).toBeVisible();
});

test("a random profile gives a spread of generated runs", async ({ page }) => {
  await page.goto("/compare?captcha=text&seed=31");
  await generate(page);
  await page.getByTestId("distribution-generate").click();
  await expect(page.getByTestId("distribution-constant")).toHaveCount(0);
  await expect(page.getByTestId("dist-interKeyCv")).toBeVisible();
});

test("keyboard: the comparison can be generated and the profile chosen without a pointer", async ({ page }) => {
  await page.goto("/compare?captcha=checkbox&seed=777");
  await page.getByTestId("profile-immediate").focus();
  await page.keyboard.press("Space");
  await page.getByTestId("generate").focus();
  await page.keyboard.press("Enter");
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
  await page.getByTestId("profile-delayed").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("synthetic-meta")).toContainText("Delayed");
});

test("classification is never colour-only and never a percentage", async ({ page }) => {
  await page.goto("/compare?captcha=checkbox&seed=777");
  await generate(page);
  const card = page.getByTestId("class-synthetic");
  const text = (await card.textContent()) ?? "";
  expect(text).toMatch(/Human-like|Synthetic-like|Uncertain/);
  expect(text).toContain("Balance of evidence");
  expect(text).toContain("not a probability");
  expect(text).not.toMatch(/\d\s*%/);
  await expect(card.getByRole("heading", { name: "Evidence" })).toBeVisible();
});

test("privacy: /compare with a non-slider CAPTCHA writes nothing, sends nothing, logs nothing", async ({ page }) => {
  await page.goto("/compare?captcha=checkbox&seed=777");
  await expect(page.getByTestId("checkbox-input")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("checkbox-input").click();
  await generate(page);
  await page.getByTestId("profile-regular-timing").check();
  await page.getByTestId("distribution-generate").click();
  await page.getByTestId("evaluation-run").click();
  await expect(label(page, "human")).toBeVisible();
  await assertNoDataLeft();
});
