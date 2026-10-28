import { readFileSync } from "node:fs";
import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";

const SEED = 424242;

async function download(page: Page, click: () => Promise<void>): Promise<{ name: string; text: string }> {
  const [d] = await Promise.all([page.waitForEvent("download"), click()]);
  return { name: d.suggestedFilename(), text: readFileSync((await d.path()), "utf-8") };
}

async function startExperiment(page: Page, captcha = "checkbox", seed = SEED) {
  await page.goto("/experiments");
  await page.getByTestId("exp-start-captcha").selectOption(captcha);
  await page.getByTestId("exp-start-seed").fill(String(seed));
  await page.getByTestId("exp-start-button").click();
  await expect(page.getByTestId("exp-definition")).toBeVisible();
}

async function recordCheckbox(page: Page, label = "") {
  await page.getByTestId("checkbox-input").click();
  if (label) await page.getByTestId("exp-record-label").fill(label);
  await page.getByTestId("exp-add-recorded").click();
}

async function addBatch(page: Page, profile: string, seed: number, runs: number) {
  await page.getByTestId("exp-syn-profile").selectOption(profile);
  await page.getByTestId("exp-syn-seed").fill(String(seed));
  await page.getByTestId("exp-syn-runs").fill(String(runs));
  await page.getByTestId("exp-add-synthetic").click();
}

/** What the workspace shows, as plain data, for before/after comparisons. */
async function snapshot(page: Page) {
  return page.evaluate(() => ({
    config: Array.from(document.querySelectorAll('[data-testid^="config-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.textContent}`),
    labels: Array.from(document.querySelectorAll('[data-testid^="sample-label-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.getAttribute("data-label")}`),
    counts: Array.from(document.querySelectorAll('[data-testid^="counts-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.textContent}`),
    stats: Array.from(document.querySelectorAll('[data-testid^="stat-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.textContent}`),
    name: document.querySelector<HTMLInputElement>('[data-testid="exp-name"]')?.value,
    notes: document.querySelector<HTMLTextAreaElement>('[data-testid="exp-notes"]')?.value,
  }));
}

// ------------------------------------------------------------------------------------------------ builder

test("builder: schema-driven controls; changing the CAPTCHA resets variant and level, never the seed", async ({ page }) => {
  await page.goto("/builder?lang=en");
  await expect(page.getByTestId("builder-preview")).toBeVisible();
  const options = await page.getByTestId("builder-captcha").locator("option").allTextContents();
  expect(options).toHaveLength(11);
  await page.getByTestId("builder-seed").fill("12345");
  await page.getByTestId("builder-captcha").selectOption("text");
  await expect(page.getByTestId("builder-seed")).toHaveValue("12345");
  await expect(page.getByTestId("config-captcha")).toHaveText("Text");
  const variants = await page.getByTestId("builder-variant").locator("option").count();
  expect(variants).toBeGreaterThan(1);
  await page.getByTestId("builder-difficulty-hard").click();
  await expect(page.getByTestId("config-difficulty")).toHaveText("Hard");
  await expect(page.getByTestId("builder-seed")).toHaveValue("12345"); // the seed never changes by itself
  await page.getByTestId("builder-captcha").selectOption("checkbox");
  await expect(page.getByTestId("builder-difficulty-hard")).toBeDisabled(); // checkbox offers one level
  await expect(page.getByTestId("config-seed")).toHaveText("12345");
});

test("builder: an invalid seed is explained, no challenge is built, nothing is repaired", async ({ page }) => {
  await page.goto("/builder?lang=en&captcha=text&variant=noisy&difficulty=hard&seed=31");
  await expect(page.getByTestId("config-variant")).toHaveText("Noisy");
  for (const bad of ["abc", "-4", "1.5", "99999999999", ""]) {
    await page.getByTestId("builder-seed").fill(bad);
    await expect(page.getByTestId("builder-errors")).toContainText("Seed must be a whole number");
    await expect(page.getByTestId("builder-preview")).toHaveCount(0);
    await expect(page.getByTestId("builder-seed")).toHaveValue(bad);
  }
  await page.getByTestId("builder-seed").fill("32");
  await expect(page.getByTestId("builder-errors")).toHaveCount(0);
  await expect(page.getByTestId("config-seed")).toHaveText("32");
});

test("builder: the URL starts it only when every field is valid; the seed is generated, typed and copied explicitly", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/builder?lang=en&captcha=text&variant=nope&difficulty=hard&seed=31"); // invalid variant: ignored, defaults used
  await expect(page.getByTestId("builder-captcha")).toHaveValue("slider");
  const first = await page.getByTestId("builder-seed").inputValue();
  await page.getByTestId("builder-new-seed").click();
  const second = await page.getByTestId("builder-seed").inputValue();
  expect(second).not.toBe(first);
  await page.getByTestId("builder-name").fill("renamed"); // editing the name must not change the seed or the challenge
  await expect(page.getByTestId("builder-seed")).toHaveValue(second);
  await page.getByTestId("builder-copy-seed").click();
  await expect(page.getByTestId("builder-notice")).toContainText("copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(second);
  await expect(page).toHaveURL(new RegExp(`seed=${second}`));
  expect(page.url()).not.toContain("renamed");
});

test("builder: same definition + seed gives the same challenge; the downloaded file says so", async ({ page }) => {
  await page.goto("/builder?lang=en&captcha=image-grid&variant=basic-shapes&difficulty=medium&seed=17");
  const a = await page.getByTestId("challenge-config").textContent();
  await page.goto("/builder?lang=en&captcha=image-grid&variant=basic-shapes&difficulty=medium&seed=17");
  expect(await page.getByTestId("challenge-config").textContent()).toBe(a);
  await page.getByTestId("builder-name").fill("My challenge");
  const file = await download(page, () => page.getByTestId("builder-download").click());
  expect(file.name).toBe("captchalab-challenge-image-grid-17.json");
  const json = JSON.parse(file.text) as Record<string, unknown>;
  expect(json).toMatchObject({ format: "challenge-definition", version: 1, captcha: "image-grid", variant: "basic-shapes", difficulty: "medium", seed: 17, name: "My challenge" });
  expect(typeof json["pluginVersion"]).toBe("string");
  expect(Object.keys(json)).not.toContain("events");
});

test("builder: import a definition; reject wrong, hostile and oversized files with a readable message", async ({ page }) => {
  await page.goto("/builder?lang=en");
  const good = { format: "challenge-definition", version: 1, captcha: "text", pluginVersion: "1.0.0", variant: "rotated", difficulty: "hard", seed: 99, parameters: {} };
  // First get a real file from the page so parameters and plugin version are right.
  await page.getByTestId("builder-captcha").selectOption("text");
  await page.getByTestId("builder-variant").selectOption("rotated");
  await page.getByTestId("builder-difficulty-hard").click();
  await page.getByTestId("builder-seed").fill("99");
  const real = await download(page, () => page.getByTestId("builder-download").click());
  await page.getByTestId("builder-captcha").selectOption("slider");
  await page.getByTestId("builder-import").setInputFiles({ name: "c.json", mimeType: "application/json", buffer: Buffer.from(real.text) });
  await expect(page.getByTestId("builder-notice")).toContainText("imported");
  await expect(page.getByTestId("builder-captcha")).toHaveValue("text");
  await expect(page.getByTestId("builder-seed")).toHaveValue("99");
  await expect(page.getByTestId("config-variant")).toHaveText("Rotated");

  const reject = async (content: string | Buffer, message: RegExp) => {
    await page.getByTestId("builder-import").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from(content) });
    await expect(page.getByTestId("builder-notice")).toContainText(message);
    await expect(page.getByTestId("builder-notice")).toHaveAttribute("role", "alert");
    await expect(page.getByTestId("builder-seed")).toHaveValue("99"); // nothing was applied
  };
  await reject("{not json", /not valid JSON/);
  await reject(JSON.stringify({ ...JSON.parse(real.text), version: 2 }), /Unsupported format version/);
  await reject(JSON.stringify({ ...JSON.parse(real.text), extra: 1 }), /unknown field/);
  await reject(JSON.stringify({ ...good, captcha: "proof-of-work" }), /not supported/);
  await reject('{"format":"challenge-definition","__proto__":{"x":1}}', /forbidden key/);
  await reject("[".repeat(100) + "]".repeat(100), /nested too deeply/);
  await reject(JSON.stringify({ format: "experiment-bundle" }), /experiment file/);
  await reject(Buffer.alloc(26 * 1024 * 1024, 32), /too large/);
  // and the page still works
  await page.getByTestId("builder-seed").fill("100");
  await expect(page.getByTestId("config-seed")).toHaveText("100");
});

test("builder to experiments and to Compare carries the exact definition", async ({ page }) => {
  await page.goto("/builder?lang=en&captcha=rotation&variant=classic&difficulty=hard&seed=2024");
  const cfg = await page.getByTestId("challenge-config").textContent();
  await page.getByTestId("builder-to-experiment").click();
  await expect(page.getByTestId("exp-definition")).toBeVisible();
  expect(await page.getByTestId("challenge-config").textContent()).toBe(cfg);
  await page.getByTestId("exp-to-compare").click();
  await expect(page.getByTestId("compare-same-config")).toBeVisible();
  expect(await page.getByTestId("challenge-config").textContent()).toBe(cfg);
  await expect(page.getByTestId("captcha-select")).toHaveValue("rotation");
});

test("builder: the preview is playable and keyboard operable", async ({ page }) => {
  await page.goto("/builder?lang=en&captcha=checkbox&variant=basic&difficulty=medium&seed=777");
  await page.getByTestId("checkbox-input").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("builder-tried")).toContainText("One attempt recorded");
  // changing any defining field discards the attempt: nothing stale stays on screen
  await page.getByTestId("builder-seed").fill("778");
  await expect(page.getByTestId("builder-tried")).toHaveCount(0);
  await expect(page.getByTestId("checkbox-input")).not.toBeChecked();
  await page.getByTestId("checkbox-input").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("builder-tried")).toBeVisible();
  // keyboard path through the form
  await page.getByTestId("builder-captcha").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("builder-captcha")).not.toHaveValue("checkbox");
  await page.getByTestId("builder-new-seed").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("builder-seed")).not.toHaveValue("777");
});

// -------------------------------------------------------------------------------------------- experiments

test("experiments: record several local sessions, add deterministic batches, compare, inspect evidence", async ({ page }) => {
  await startExperiment(page);
  await expect(page.getByTestId("exp-add-recorded")).toBeDisabled();
  await recordCheckbox(page, "first");
  await recordCheckbox(page, "second");
  await expect(page.getByTestId("exp-record-status")).toContainText("2/100");
  await addBatch(page, "regular-timing", 10, 5);
  await addBatch(page, "immediate", 1, 4);

  await expect(page.getByTestId("exp-shown-count")).toContainText("Showing 11 of 11");
  await expect(page.getByTestId("sample-r1")).toContainText("first");
  await expect(page.getByTestId("sample-r1")).toContainText("Recorded session");
  await expect(page.getByTestId("sample-s1#5")).toContainText("seed 14"); // base 10 + run 4
  await expect(page.getByTestId("exp-batch-s1")).toContainText("10");

  // counts of outputs, never percentages or accuracy
  await expect(page.getByTestId("counts-s2-synthetic-like")).toHaveText("4");
  await expect(page.getByTestId("counts-s1-uncertain")).toHaveText("5");
  const text = ((await page.getByTestId("exp-counts").textContent()) ?? "") + ((await page.getByTestId("exp-stats").textContent()) ?? "");
  expect(text).not.toMatch(/\d\s*%|accuracy|precision|recall|ROC|AUC|confusion/i);

  // missing stays missing: one activation has no rhythm between activations
  await expect(page.getByTestId("stat-recorded-interClickCv")).toContainText("n=0");
  await expect(page.getByTestId("stat-recorded-interClickCv")).toContainText("missing=2");
  await expect(page.getByTestId("stat-s1-interClickCv")).toContainText("n=5");
  await expect(page.getByTestId("exp-strips")).toBeVisible();

  // filters
  await page.getByTestId("exp-filter-kind").selectOption("synthetic");
  await expect(page.getByTestId("exp-shown-count")).toContainText("Showing 9 of 11");
  await page.getByTestId("exp-filter-profile").selectOption("immediate");
  await expect(page.getByTestId("exp-shown-count")).toContainText("Showing 4 of 11");
  await page.getByTestId("exp-filter-label").selectOption("uncertain");
  await expect(page.getByTestId("exp-shown-count")).toContainText("Showing 0 of 11");
  await page.getByTestId("exp-filter-label").selectOption("all");
  await page.getByTestId("exp-filter-kind").selectOption("all");
  await page.getByTestId("exp-filter-profile").selectOption("all");
  await page.getByTestId("exp-filter-group").selectOption("rhythm");
  await expect(page.getByTestId("exp-stats").locator("tbody tr")).toHaveCount(1);
  await page.getByTestId("exp-filter-group").selectOption("all");

  // selection and views (the checkbox has no path, so timelines)
  await page.getByTestId("sample-select-r1").check();
  await page.getByTestId("sample-select-s1#1").check();
  await expect(page.getByTestId("view-r1")).toBeVisible();
  await expect(page.getByTestId("strip-s1#1")).toBeVisible();
  await expect(page.getByTestId("traj-r1")).toHaveCount(0);
  await page.getByTestId("exp-clear-selection").click();
  await expect(page.getByTestId("exp-selected-empty")).toBeVisible();

  // evidence
  await page.getByTestId("sample-inspect-s2#1").click();
  await expect(page.getByTestId("exp-class-label")).toHaveAttribute("data-label", "synthetic-like");
  await expect(page.getByTestId("exp-class-evidence").locator("li").first()).toBeVisible();
  await expect(page.getByTestId("exp-class-version")).toContainText("behavioral-baseline@1");
  await expect(page.getByTestId("exp-inspect-source")).toContainText("synthetic@1");
  await expect(page.getByTestId("classifier-disclaimer")).toContainText("does not prove whether a real user is human or automated");
});

test("experiments: limits are enforced and explained", async ({ page }) => {
  await startExperiment(page);
  await addBatch(page, "immediate", 1, 101);
  await expect(page.getByTestId("exp-notice")).toContainText("runs must be from 1 to 100");
  await addBatch(page, "immediate", 1, 0);
  await expect(page.getByTestId("exp-notice")).toContainText("runs must be");
  await addBatch(page, "immediate", 1.5, 3);
  await expect(page.getByTestId("exp-notice")).toContainText("base seed");
  for (let i = 0; i < 3; i++) await addBatch(page, "immediate", i * 1000, 100);
  await addBatch(page, "immediate", 5000, 1);
  await expect(page.getByTestId("exp-notice")).toContainText("at most 300 synthetic runs");
  await expect(page.getByTestId("exp-shown-count")).toContainText("of 300");
  await expect(page.getByTestId("exp-shown-count")).toContainText("first 100");
  expect(await page.getByTestId("exp-samples").locator("tbody tr").count()).toBe(100);
  await page.getByTestId("exp-select-shown").click();
  await page.getByTestId("exp-clear-selection").click();
  await page.getByTestId("exp-record-tags").fill("<b>bad</b>");
  await page.getByTestId("checkbox-input").click();
  await page.getByTestId("exp-add-recorded").click();
  await expect(page.getByTestId("exp-notice")).toContainText("Tags:");
});

test("experiments: export, reload to a fresh state, import, and the same experiment comes back", async ({ page }) => {
  page.on("dialog", (d) => void d.accept()); // the unsaved-work prompt when reloading
  await startExperiment(page);
  await page.getByTestId("exp-name").fill("Round trip");
  await page.getByTestId("exp-notes").fill("Notes with <b>markup</b> stay text.");
  await recordCheckbox(page, "alpha");
  await recordCheckbox(page, "beta");
  await addBatch(page, "regular-timing", 7, 6);
  await addBatch(page, "delayed", 3, 5);
  await expect(page.getByTestId("exp-unsaved")).toBeVisible();
  const before = await snapshot(page);

  const bundle = await download(page, () => page.getByTestId("exp-download-bundle").click());
  expect(bundle.name).toBe(`captchalab-experiment-round-trip-${SEED}.json`);
  await expect(page.getByTestId("exp-unsaved")).toHaveCount(0);
  const json = JSON.parse(bundle.text) as { format: string; version: number; versions: Record<string, unknown>; recorded: unknown[]; synthetic: { profile: string; runs: number }[]; integrity: { algorithm: string; value: string }; challenge: { seed: number } };
  expect(json).toMatchObject({ format: "experiment-bundle", version: 1, challenge: { seed: SEED }, versions: { signals: "behavior-signals@1", classifier: "behavioral-baseline@1", syntheticGenerator: "synthetic@1" } });
  expect(json.recorded).toHaveLength(2);
  expect(json.synthetic.map((s) => [s.profile, s.runs])).toEqual([["regular-timing", 6], ["delayed", 5]]);
  expect(json.integrity.algorithm).toBe("sha256-canonical-json");
  expect(bundle.text).not.toMatch(/"startedAt":\s*[1-9]/); // no wall-clock time of the interaction is exported

  await page.reload();
  await expect(page.getByTestId("exp-start")).toBeVisible(); // nothing survived: no storage
  expect((await snapshot(page)).labels).toEqual([]);

  await page.getByTestId("exp-import-file").setInputFiles({ name: bundle.name, mimeType: "application/json", buffer: Buffer.from(bundle.text) });
  await expect(page.getByTestId("exp-definition")).toBeVisible();
  await expect(page.getByTestId("exp-notice")).toContainText("Experiment imported");
  const after = await snapshot(page);
  expect(after).toEqual(before);
  await expect(page.getByTestId("sample-r1")).toContainText("Imported");
  await expect(page.getByTestId("exp-notes")).toHaveValue("Notes with <b>markup</b> stay text.");
  await expect(page.locator("main b")).toHaveCount(0); // never rendered as markup

  // exporting again gives the same experiment
  const again = await download(page, () => page.getByTestId("exp-download-bundle").click());
  const a = JSON.parse(again.text) as { integrity: { value: string } };
  expect(a.integrity.value).toBe(json.integrity.value);
});

test("experiments: importing replaces state only after an explicit yes, and clears selection, inspection and filters", async ({ page }) => {
  await startExperiment(page, "checkbox", 111);
  await recordCheckbox(page, "keep me");
  await addBatch(page, "immediate", 1, 3);
  const bundle = await download(page, () => page.getByTestId("exp-download-bundle").click());
  const other = bundle.text.replace('"seed": 111', '"seed": 222');
  expect(other).not.toBe(bundle.text);

  // a different experiment to import: build it from a second start
  await page.getByTestId("exp-clear").click();
  await page.getByTestId("exp-clear-yes").click();
  await page.goto("/experiments");
  await page.getByTestId("exp-start-captcha").selectOption("text");
  await page.getByTestId("exp-start-seed").fill("5");
  await page.getByTestId("exp-start-button").click();
  await addBatch(page, "uniform-typing", 1, 4);
  await page.getByTestId("sample-select-s1#1").check();
  await page.getByTestId("sample-inspect-s1#1").click();
  await page.getByTestId("exp-filter-kind").selectOption("synthetic");
  await expect(page.getByTestId("exp-inspect")).toBeVisible();

  await page.getByTestId("exp-import-file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(bundle.text) });
  await expect(page.getByTestId("exp-confirm-replace")).toBeVisible();
  await page.getByTestId("exp-confirm-no").click();
  await expect(page.getByTestId("exp-confirm-replace")).toHaveCount(0);
  await expect(page.getByTestId("config-seed")).toHaveText("5"); // still the old one

  await page.getByTestId("exp-import-file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(bundle.text) });
  await page.getByTestId("exp-confirm-yes").click();
  await expect(page.getByTestId("config-seed")).toHaveText("111");
  await expect(page.getByTestId("config-captcha")).toHaveText("Checkbox");
  await expect(page.getByTestId("exp-inspect")).toHaveCount(0);
  await expect(page.getByTestId("exp-selected-empty")).toBeVisible();
  await expect(page.getByTestId("exp-filter-kind")).toHaveValue("all");
  await expect(page.getByTestId("exp-batch-s1")).toContainText("3");
  await expect(page.getByTestId("sample-r1")).toContainText("keep me");
  await expect(page.getByTestId("exp-record-status")).toContainText("No session to add yet");
});

test("experiments: a session file joins only the experiment of the same challenge", async ({ page }) => {
  await startExperiment(page, "checkbox", 777);
  await recordCheckbox(page, "one");
  await page.getByTestId("sample-inspect-r1").click();
  const session = await download(page, () => page.getByTestId("exp-download-session").click());
  expect(session.name).toBe("captchalab-session-checkbox-r1.json");
  const parsed = JSON.parse(session.text) as { format: string; source: { kind: string }; session: { startedAt: number } };
  expect(parsed).toMatchObject({ format: "interaction-session", source: { kind: "recorded" } });
  expect(parsed.session.startedAt).toBe(0);

  await page.getByTestId("exp-import-file").setInputFiles({ name: "s.json", mimeType: "application/json", buffer: Buffer.from(session.text) });
  await expect(page.getByTestId("exp-notice")).toContainText("Imported session added");
  await expect(page.getByTestId("sample-r2")).toContainText("Imported");
  await expect(page.getByTestId("exp-shown-count")).toContainText("2 of 2");

  const wrongSeed = session.text.replace(/"seed": 777/, '"seed": 778');
  await page.getByTestId("exp-import-file").setInputFiles({ name: "s.json", mimeType: "application/json", buffer: Buffer.from(wrongSeed) });
  await expect(page.getByTestId("exp-notice")).toContainText("different challenge");
  await expect(page.getByTestId("exp-notice").getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("exp-shown-count")).toContainText("2 of 2");
});

test("experiments: hostile and malformed files change nothing and say why", async ({ page }) => {
  await startExperiment(page, "checkbox", 777);
  await recordCheckbox(page, "one");
  const bundle = await download(page, () => page.getByTestId("exp-download-bundle").click());
  const bad = async (content: string | Buffer, message: RegExp) => {
    await page.getByTestId("exp-import-file").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from(content) });
    await expect(page.getByTestId("exp-notice")).toContainText(message);
    await expect(page.getByTestId("exp-notice").getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("exp-confirm-replace")).toHaveCount(0);
    await expect(page.getByTestId("exp-shown-count")).toContainText("1 of 1");
  };
  const j = JSON.parse(bundle.text) as Record<string, unknown>;
  await bad("nope", /not valid JSON/);
  await bad(JSON.stringify({ ...j, version: 9 }), /Unsupported format version/);
  await bad(JSON.stringify({ ...j, surprise: true }), /unknown field/);
  await bad(bundle.text.replace('"recorded": [', '"__proto__": {"x": 1}, "recorded": ['), /forbidden key/);
  await bad(JSON.stringify({ format: "experiment-summary", version: 1 }), /one-way/);
  await bad('{"format":"something-else"}', /Unsupported file format/);
  await bad(Buffer.alloc(26 * 1024 * 1024, 32), /too large/);
  expect(await page.evaluate(() => ({} as Record<string, unknown>)["x"])).toBeUndefined();
  await expect(page.getByTestId("exp-notes")).toBeVisible(); // still alive
});

test("experiments: a summary download holds counts and statistics, not sessions", async ({ page }) => {
  await startExperiment(page, "checkbox", 777);
  await addBatch(page, "regular-timing", 1, 3);
  const summary = await download(page, () => page.getByTestId("exp-download-summary").click());
  const s = JSON.parse(summary.text) as { format: string; cohorts: { count: number; classifierOutputs: Record<string, number> }[] };
  expect(s.format).toBe("experiment-summary");
  expect(s.cohorts[0]!.count).toBe(3);
  expect(summary.text).not.toContain('"events"');
  expect(summary.text).not.toMatch(/accuracy|probab/i);
});

test("experiments: a recorded Slider session shows trajectories next to generated ones on the same challenge", async ({ page }) => {
  await page.goto("/builder?lang=en&captcha=slider&variant=classic&difficulty=medium&seed=12345");
  await page.getByTestId("builder-to-experiment").click();
  await expect(page.getByTestId("slider-handle")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("slider-track").scrollIntoViewIfNeeded();
  const t2 = (await page.getByTestId("slider-track").boundingBox())!;
  const h = (await page.getByTestId("slider-handle").boundingBox())!;
  const y = h.y + h.height / 2;
  await page.mouse.move(h.x + h.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(t2.x + t2.width * 0.3, y + 2, { steps: 8 });
  await page.mouse.move(t2.x + t2.width * 0.45, y, { steps: 8 });
  await page.mouse.up();
  await page.getByTestId("exp-add-recorded").click();
  await addBatch(page, "noisy", 1, 3);
  await page.getByTestId("sample-select-r1").check();
  await page.getByTestId("sample-select-s1#1").check();
  await expect(page.getByTestId("traj-r1")).toBeVisible();
  await expect(page.getByTestId("traj-s1#1")).toBeVisible();
  await expect(page.getByTestId("stat-recorded-pointerDistance")).toContainText("n=1");
  await expect(page.getByTestId("stat-s1-pointerDistance")).toContainText("n=3");
});

// ---------------------------------------------------------------------------------------- privacy & a11y

test("privacy: builder and experiments make no request, log nothing, store nothing", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await page.goto("/builder?lang=en&captcha=checkbox&variant=basic&difficulty=medium&seed=777");
  await expect(page.getByTestId("builder-preview")).toBeVisible();
  let assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("builder-new-seed").click();
  await page.getByTestId("checkbox-input").click();
  const file = await download(page, () => page.getByTestId("builder-download").click());
  await page.getByTestId("builder-import").setInputFiles({ name: file.name, mimeType: "application/json", buffer: Buffer.from(file.text) });
  await assertNoDataLeft();

  await startExperiment(page, "checkbox", 777);
  assertNoDataLeft = await watchPrivacy(page);
  await recordCheckbox(page, "p");
  await addBatch(page, "delayed", 1, 10);
  await page.getByTestId("sample-inspect-s1#1").click();
  const bundle = await download(page, () => page.getByTestId("exp-download-bundle").click());
  await page.getByTestId("exp-import-file").setInputFiles({ name: bundle.name, mimeType: "application/json", buffer: Buffer.from(bundle.text) });
  await page.getByTestId("exp-confirm-yes").click();
  await expect(page.getByTestId("sample-r1")).toBeVisible();
  await assertNoDataLeft();
});

test("privacy: no fingerprinting API is touched on the research routes", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __fp: string[] };
    w.__fp = [];
    const note = (what: string) => () => void w.__fp.push(what);
    HTMLCanvasElement.prototype.toDataURL = ((orig) => function (this: HTMLCanvasElement, ...a: Parameters<typeof orig>) { note("canvas.toDataURL")(); return orig.apply(this, a); })(HTMLCanvasElement.prototype.toDataURL);
    HTMLCanvasElement.prototype.getContext = ((orig) => function (this: HTMLCanvasElement, ...a: Parameters<typeof orig>) { if (String(a[0]).includes("webgl")) note("webgl")(); return orig.apply(this, a as never); })(HTMLCanvasElement.prototype.getContext) as never;
    if (document.fonts && "check" in document.fonts) document.fonts.check = ((orig) => function (this: FontFaceSet, ...a: Parameters<typeof orig>) { note("fonts.check")(); return orig.apply(this, a); })(document.fonts.check);
  });
  await page.goto("/builder?lang=en");
  await page.getByTestId("builder-new-seed").click();
  await startExperiment(page, "text", 31);
  await addBatch(page, "variable-typing", 1, 5);
  await page.getByTestId("sample-inspect-s1#1").click();
  expect(await page.evaluate(() => (window as unknown as { __fp: string[] }).__fp)).toEqual([]);
});

test("accessibility: labelled controls, announced errors, keyboard operation of the workspace", async ({ page }) => {
  await startExperiment(page, "checkbox", 777);
  for (const id of ["exp-name", "exp-notes", "exp-record-label", "exp-record-tags", "exp-syn-profile", "exp-syn-seed", "exp-syn-runs", "exp-import-file"]) {
    expect(await page.getByTestId(id).evaluate((el: HTMLElement) => (el as HTMLInputElement).labels?.length ?? 0), id).toBeGreaterThan(0);
  }
  // keyboard: add a batch, select a session with Space, inspect it with Enter
  await page.getByTestId("exp-syn-runs").fill("3");
  await page.getByTestId("exp-add-synthetic").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("sample-s1#1")).toBeVisible();
  await page.getByTestId("sample-select-s1#1").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("view-s1#1")).toBeVisible();
  await page.getByTestId("sample-inspect-s1#1").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("exp-inspect")).toBeVisible();
  // errors are announced
  await page.getByTestId("exp-syn-runs").fill("999");
  await page.getByTestId("exp-add-synthetic").click();
  await expect(page.getByTestId("exp-notice").getByRole("alert")).toBeVisible();
  // the file input is reachable by keyboard
  await page.getByTestId("exp-import-file").focus();
  await expect(page.getByTestId("exp-import-file")).toBeFocused();
});

test("the research pages are listed in the app shell and the Behavioral Lab", async ({ page }) => {
  await page.goto("/#experiments");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByTestId("exp-memory-note")).toBeAttached();
  await page.getByTestId("pick-builder").click();
  await expect(frame.getByTestId("builder-form")).toBeAttached();
  await page.goto("/behavior");
  await expect(page.getByTestId("cta-builder")).toHaveAttribute("href", /builder/);
  await expect(page.getByTestId("cta-experiments")).toHaveAttribute("href", /experiments/);
});
