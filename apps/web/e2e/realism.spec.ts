import { type Page } from "@playwright/test";
import { createRng } from "@captchalab/captcha-core";
import { expectedSelection, registry } from "@captchalab/captcha-plugins";
import { expect, test } from "./fixtures";
import { expectValidIds } from "./a11y";
import { watchPrivacy } from "./privacy";
import { TAXONOMY } from "../lib/taxonomy";

/**
 * v1.1 realism: each upgraded challenge is completed through the real UI, with the answer derived from the same seeded
 * generator the page uses (never read from the page). Pictures are CaptchaLab's own drawings, so nothing is fetched.
 */
const metric = (page: Page, id: string) => page.getByTestId(`metric-${id}`);

// ----------------------------------------------------------------------------------------------------- Image Grid
for (const variant of ["photo-categories", "scene-objects"] as const) {
  const SEED = 17;
  const challenge = registry.get("image-grid").generate({ rng: createRng(SEED), variantId: variant, difficulty: "medium" });
  const good = expectedSelection(challenge);

  test(`Image Grid ${variant}: select the pictures, Verify, Passed; names do not give the answer; nothing is fetched`, async ({ page }) => {
    await page.goto(`/playground/image-grid?seed=${SEED}&variant=${variant}&difficulty=medium`);
    await expect(page.getByTestId("image-grid")).toBeVisible();
    const assertNoDataLeft = await watchPrivacy(page);
    // The accessible name of every tile is only its number: it never names the object.
    for (const cell of challenge.cells) {
      await expect(page.getByTestId(`cell-${cell.id}`)).toHaveAttribute("aria-label", /^Image \d of 9$/);
    }
    await expect(page.getByTestId("grid-alternative")).toHaveAttribute("href", /playground\/audio/);
    for (const id of good) await page.getByTestId(`cell-${id}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expect(metric(page, "selectionCount")).toHaveText(String(good.length));
    await assertNoDataLeft();
    await expectValidIds(page);
  });

  test(`Image Grid ${variant}: a wrong tile fails, and the keyboard alone can finish it`, async ({ page }) => {
    await page.goto(`/playground/image-grid?seed=${SEED}&variant=${variant}&difficulty=medium`);
    const wrong = challenge.cells.find((c) => c.shape !== challenge.target)!.id;
    await page.getByTestId(`cell-${wrong}`).click();
    for (const id of good) await page.getByTestId(`cell-${id}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Not passed");
    await page.getByTestId(`cell-${wrong}`).focus();
    await page.keyboard.press("Space"); // deselect the wrong tile
    await expect(page.getByTestId("result")).toHaveCount(0);
    await page.getByTestId("verify").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("result")).toContainText("Passed");
  });
}

test("Image Grid pictures: the same seed draws the same grid; New challenge replaces it", async ({ page }) => {
  const url = "/playground/image-grid?seed=5&variant=photo-categories&difficulty=hard";
  await page.goto(url);
  const first = await page.getByTestId("image-grid").innerHTML();
  await page.goto(url);
  expect(await page.getByTestId("image-grid").innerHTML()).toBe(first);
  await page.getByTestId("cell-c1").click();
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("cell-c1")).toHaveAttribute("aria-pressed", "false");
  expect(await page.getByTestId("image-grid").innerHTML()).not.toBe(first);
});

// ------------------------------------------------------------------------------------------------------- Slider
test("Slider puzzle: the piece follows the handle, fits the gap at the target, and Passed", async ({ page }) => {
  const SEED = 7;
  const c = registry.get("slider").generate({ rng: createRng(SEED), variantId: "puzzle", difficulty: "medium" });
  await page.goto(`/playground/slider?seed=${SEED}&variant=puzzle&difficulty=medium`);
  await expect(page.getByTestId("puzzle-picture")).toBeVisible();
  await expect(page.getByTestId("slider-target")).toHaveCount(0); // the gap is the target; no marker on the bar
  const piece = page.getByTestId("puzzle-piece");
  const before = await piece.getAttribute("transform");
  const handle = page.getByTestId("slider-handle");
  await handle.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < Math.round(c.target * 100); i++) await page.keyboard.press("ArrowRight");
  expect(await piece.getAttribute("transform")).not.toBe(before); // the piece moved with the handle
  await expect(piece).toHaveAttribute("transform", /translate\((-?0(\.\d+)?|-?\d\.\d+e-\d+) 0\)/); // and sits on the gap (shift ~ 0)
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expectValidIds(page);
});

test("Slider puzzle: released far from the gap is Not passed; Try again resets the piece; the accessible name does not say where the gap is", async ({ page }) => {
  await page.goto("/playground/slider?seed=7&variant=puzzle&difficulty=medium");
  const handle = page.getByTestId("slider-handle");
  await expect(handle).toHaveAttribute("aria-label", /Puzzle slider handle/);
  await handle.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result")).toContainText("Not passed");
  await page.getByRole("button", { name: "Try again (same challenge)" }).click();
  await expect(page.getByTestId("result")).toHaveCount(0);
  await expect(handle).toHaveAttribute("aria-valuenow", "0");
});

// ------------------------------------------------------------------------------------------------- Rotation
test("Rotation upright picture: turn the picture the right way up with the keyboard; a wrong angle fails", async ({ page }) => {
  const SEED = 11;
  const c = registry.get("rotation").generate({ rng: createRng(SEED), variantId: "upright-object", difficulty: "medium" });
  await page.goto(`/playground/rotation?seed=${SEED}&variant=upright-object&difficulty=medium`);
  const object = page.getByTestId("rotation-object");
  await expect(object).toHaveAttribute("aria-label", /Picture to turn/);
  await expect(page.getByText("Turn the picture until it is the right way up")).toBeVisible();
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed"); // as generated, it is turned away from upright
  await object.focus();
  const a = c.initialAngle;
  const [key, presses] = a <= 180 ? (["ArrowLeft", Math.round(a / 5)] as const) : (["ArrowRight", Math.round((360 - a) / 5)] as const);
  for (let i = 0; i < presses; i++) await page.keyboard.press(key);
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await expectValidIds(page);
});

// ------------------------------------------------------------------------------------------- Drag & Drop
test("Drag & Drop objects: three pictured cards onto their silhouettes, by keyboard, then Passed", async ({ page }) => {
  const SEED = 4242;
  const c = registry.get("drag-drop").generate({ rng: createRng(SEED), variantId: "object-silhouette", difficulty: "medium" });
  await page.goto(`/playground/drag-drop?seed=${SEED}&variant=object-silhouette&difficulty=medium`);
  await expect(page.getByText("Drag each object card onto the silhouette")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  for (const it of c.items) {
    const target = c.targets.find((t) => t.acceptsItemId === it.id)!;
    await page.getByTestId(`item-${it.id}`).focus();
    await page.keyboard.press("Enter");
    await page.getByTestId(`drop-${target.id}`).focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId(`item-${it.id}`)).toHaveAttribute("data-placement", target.id);
  }
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await assertNoDataLeft();
  await expectValidIds(page);
});

test("Drag & Drop objects: a wrong silhouette is Not passed", async ({ page }) => {
  const SEED = 4242;
  const c = registry.get("drag-drop").generate({ rng: createRng(SEED), variantId: "object-silhouette", difficulty: "medium" });
  await page.goto(`/playground/drag-drop?seed=${SEED}&variant=object-silhouette&difficulty=medium`);
  const [a, b, d] = c.items;
  const targetOf = (id: string) => c.targets.find((t) => t.acceptsItemId === id)!.id;
  const place = async (itemId: string, targetId: string) => {
    await page.getByTestId(`item-${itemId}`).focus();
    await page.keyboard.press("Enter");
    await page.getByTestId(`drop-${targetId}`).focus();
    await page.keyboard.press("Enter");
  };
  await place(a!.id, targetOf(b!.id));
  await place(b!.id, targetOf(d!.id));
  await place(d!.id, targetOf(a!.id));
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Not passed");
});

// -------------------------------------------------------------------------------------------------- Text
test("Text: the distorted picture is the same for the same seed, differs for another, and typing it passes", async ({ page }) => {
  const SEED = 31;
  const c = registry.get("text").generate({ rng: createRng(SEED) });
  await page.goto(`/playground/text?seed=${SEED}`);
  const first = await page.getByTestId("text-image").innerHTML();
  await page.goto(`/playground/text?seed=${SEED}`);
  expect(await page.getByTestId("text-image").innerHTML()).toBe(first);
  await page.goto(`/playground/text?seed=${SEED + 1}`);
  expect(await page.getByTestId("text-image").innerHTML()).not.toBe(first);
  await page.goto(`/playground/text?seed=${SEED}`);
  await page.getByTestId("text-answer").click();
  await page.keyboard.type(c.text, { delay: 20 });
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
});

// ------------------------------------------------------------------------ Shape Matching, MatchKey, Tile Game
test("Shape Matching objects: match each pictured object to its silhouette, Verify, Passed", async ({ page }) => {
  const SEED = 3;
  const c = registry.get("shape-matching").generate({ rng: createRng(SEED), variantId: "object-silhouette", difficulty: "medium" });
  await page.goto(`/playground/shape-matching?seed=${SEED}&variant=object-silhouette&difficulty=medium`);
  await expect(page.getByTestId("shape-matching")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  for (const s of c.sources) {
    await page.getByTestId(`source-${s.id}`).click();
    await page.getByTestId(`target-${c.matches[s.id]!}`).click();
  }
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("result")).toContainText("Passed");
  await assertNoDataLeft();
  await expectValidIds(page);
});

for (const variant of ["exact-object", "attribute-object"] as const) {
  test(`MatchKey ${variant}: the right card passes, a wrong one fails, names are only numbers, alternative offered`, async ({ page }) => {
    const SEED = 31;
    const c = registry.get("match-key").generate({ rng: createRng(SEED), variantId: variant, difficulty: "medium" });
    await page.goto(`/playground/match-key?seed=${SEED}&variant=${variant}&difficulty=medium`);
    const assertNoDataLeft = await watchPrivacy(page);
    for (const o of c.options) await expect(page.getByTestId(`option-${o.id}`)).toHaveAttribute("aria-label", /^Option \d of \d$/);
    await expect(page.getByTestId("mk-alternative")).toHaveAttribute("href", /playground\/audio/);
    const wrong = c.options.find((o) => o.id !== c.correctId)!.id;
    await page.getByTestId(`option-${wrong}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Not passed");
    await page.getByTestId(`option-${c.correctId}`).click();
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await assertNoDataLeft();
  });
}

for (const variant of ["pair-object", "pattern-object"] as const) {
  test(`Tile Game ${variant}: select the answer tiles, Passed; names are only numbers`, async ({ page }) => {
    const SEED = 31;
    const c = registry.get("tile-game").generate({ rng: createRng(SEED), variantId: variant, difficulty: "medium" });
    await page.goto(`/playground/tile-game?seed=${SEED}&variant=${variant}&difficulty=medium`);
    for (const t of c.tiles) await expect(page.getByTestId(`tile-${t.id}`)).toHaveAttribute("aria-label", /^Tile \d of \d$/);
    await expect(page.getByTestId("tg-alternative")).toHaveAttribute("href", /playground\/audio/);
    for (const id of c.answerIds) {
      await page.getByTestId(`tile-${id}`).focus();
      await page.keyboard.press("Space");
    }
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("result")).toContainText("Passed");
    await expectValidIds(page);
  });
}

// ------------------------------------------------------------------------------ the realism claims themselves
test("Learn says, for every challenge, which family it resembles and what is not cloned; the matrix has the realism column", async ({ page }) => {
  await page.goto("/learn");
  for (const entry of TAXONOMY.filter((e) => e.kind !== "lab")) {
    const block = page.getByTestId(`learn-realism-${entry.id}`);
    await expect(block, entry.id).toBeVisible();
    await expect(block).toContainText("Family:");
    await expect(block).toContainText("Intentionally not cloned:");
    await expect(page.getByTestId(`coverage-row-${entry.id}`).locator('[data-col="realism"]')).toHaveText(entry.realism === "yes" ? "Yes" : "Partial");
  }
  await expect(page.getByTestId("coverage-matrix")).toContainText("Realistic presentation");
  await expect(page.getByTestId("coverage-matrix")).not.toContainText(/100%|equivalent|identical to/i);
});

test("challenge pages draw every picture themselves: no image request, nothing outside their own origin", async ({ page }) => {
  test.setTimeout(120_000);
  const bad: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin !== new URL(page.url() === "about:blank" ? "http://localhost:3100" : page.url()).origin) bad.push(`external ${r.url()}`);
    if (r.resourceType() === "image") bad.push(`image ${r.url()}`);
  });
  for (const route of ["/playground/image-grid?variant=scene-objects", "/playground/slider?variant=puzzle", "/playground/rotation?variant=upright-object", "/playground/drag-drop?variant=object-silhouette", "/playground/shape-matching?variant=object-silhouette", "/playground/match-key?variant=exact-object", "/playground/tile-game?variant=pair-object", "/playground/text"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("section.cl-widget").first()).toBeVisible();
  }
  expect(bad).toEqual([]);
});

test("the Playground opens each family with its realistic variant, and a named variant is still honoured", async ({ page }) => {
  const expected: Record<string, string> = { "image-grid": "photo-categories", slider: "puzzle", rotation: "upright-object", "drag-drop": "object-silhouette", "shape-matching": "object-silhouette", "match-key": "exact-object", "tile-game": "pair-object" };
  for (const [id, variant] of Object.entries(expected)) {
    await page.goto(`/playground/${id}`);
    await expect(page.getByTestId("variant-select"), id).toHaveValue(variant);
  }
  await page.goto("/playground/image-grid?variant=basic-shapes");
  await expect(page.getByTestId("variant-select")).toHaveValue("basic-shapes");
});
