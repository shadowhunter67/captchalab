import { readFileSync } from "node:fs";
import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { watchPrivacy } from "./privacy";

const LABELS = ["human-like", "synthetic-like", "uncertain"];
const generate = (page: Page) => page.getByTestId("generate").click();
const label = (page: Page, side: "human" | "synthetic") => page.getByTestId(`class-${side}-label`);
const cell = (page: Page, side: "human" | "synthetic", signal: string) => page.getByTestId(`${side}-${signal}`);

async function expectClassified(page: Page) {
  for (const side of ["human", "synthetic"] as const) {
    await expect(label(page, side)).toBeVisible();
    expect(LABELS).toContain(await label(page, side).getAttribute("data-label"));
  }
  await expect(page.getByTestId("class-synthetic-evidence").locator("li").first()).toBeVisible();
  await expect(page.getByTestId("classifier-disclaimer")).toContainText("does not prove whether a real user is human or automated");
  await expect(page.getByTestId("traj-human")).toHaveCount(0); // none of these CAPTCHAs has a path to draw
  await expect(page.getByTestId("timeline-human")).toBeVisible();
  await expect(page.getByTestId("timeline-synthetic")).toBeVisible();
}

const SM = registry.get("shape-matching").generate({ rng: createRng(21), variantId: "exact", difficulty: "easy" });
const MATH = registry.get("math-logic").generate({ rng: createRng(31), variantId: "arithmetic", difficulty: "easy" });
const MEM = registry.get("memory").generate({ rng: createRng(21), variantId: "sequence", difficulty: "easy" });
const SEQ = registry.get("sequence").generate({ rng: createRng(5), variantId: "number", difficulty: "easy" });
const AUD = registry.get("audio").generate({ rng: createRng(9), variantId: "spoken-digits", difficulty: "easy" });

async function recordMemory(page: Page) {
  if (MEM.kind !== "sequence") throw new Error("expected a sequence challenge");
  await page.getByTestId("mem-start").click();
  await expect(page.getByTestId("verify")).toBeVisible({ timeout: 10000 });
  for (const id of MEM.sequence) await page.getByTestId(`option-${id}`).click();
  await page.getByTestId("verify").click();
}

test("shape matching: pairing by two presses, rhythm and wrong-attempt signals", async ({ page }) => {
  await page.goto("/compare?captcha=shape-matching&seed=21&variant=exact&difficulty=easy");
  for (const s of SM.sources) {
    await page.getByTestId(`source-${s.id}`).click();
    await page.getByTestId(`target-${SM.matches[s.id]!}`).click();
  }
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(cell(page, "human", "activationCount")).toHaveText(String(SM.sources.length * 2));
  await expect(cell(page, "synthetic", "wrongAttempts")).not.toHaveText("—");
  await expectClassified(page);
  await page.getByTestId("profile-immediate").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
  await page.getByTestId("profile-variable-interval").check();
  await expect(cell(page, "synthetic", "wrongAttempts")).toHaveText("1");
});

test("math / logic: typed answer compared with generated typing", async ({ page }) => {
  await page.goto("/compare?captcha=math-logic&seed=31&variant=arithmetic&difficulty=easy");
  await page.getByTestId("math-answer").click();
  await page.keyboard.type(String(MATH.expectedAnswer), { delay: 60 });
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(cell(page, "human", "activationCount")).toHaveText(String(String(MATH.expectedAnswer).length));
  await expectClassified(page);
  await page.getByTestId("profile-uniform-typing").check();
  // A short answer has too few gaps for a rhythm value: it is missing (a dash), never 0.
  await expect(cell(page, "synthetic", "interKeyCv")).toHaveText(String(MATH.expectedAnswer).length >= 4 ? "0.00" : "—");
  expect(LABELS).toContain(await label(page, "synthetic").getAttribute("data-label"));
});

test("sequence: a typed number answer", async ({ page }) => {
  await page.goto("/compare?captcha=sequence&seed=5&variant=number&difficulty=easy");
  await page.getByTestId("seq-answer").click();
  await page.keyboard.type(String(SEQ.kind === "number" ? SEQ.expectedAnswer : ""), { delay: 60 });
  await page.getByTestId("verify").click();
  await generate(page);
  await expectClassified(page);
  await page.getByTestId("profile-immediate").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
});

test("memory: recall actions only, in the recorded session's own recall context", async ({ page }) => {
  await page.goto("/compare?captcha=memory&seed=21&variant=sequence&difficulty=easy");
  await recordMemory(page);
  await generate(page);
  await expect(cell(page, "human", "activationCount")).toHaveText(String(MEM.kind === "sequence" ? MEM.sequence.length : 0));
  await expect(cell(page, "synthetic", "activationTime")).not.toHaveText("—");
  await expectClassified(page);
  await page.getByTestId("profile-immediate").check();
  await expect(label(page, "synthetic")).toHaveAttribute("data-label", "synthetic-like");
  await page.getByTestId("profile-variable-interval").check();
  await expect(cell(page, "synthetic", "corrections")).toHaveText("1");
});

test("audio: play and type; the clips are the only requests", async ({ page }) => {
  await page.goto("/compare?captcha=audio&seed=9&variant=spoken-digits&difficulty=easy");
  await page.getByTestId("audio-play").click();
  await page.getByTestId("audio-answer").click();
  await page.keyboard.type(AUD.digits, { delay: 60 });
  await page.getByTestId("verify").click();
  await generate(page);
  await expect(cell(page, "human", "playCount")).toHaveText("1");
  await page.getByTestId("profile-uniform-typing").check();
  await expect(cell(page, "synthetic", "playCount")).toHaveText("1");
  await expectClassified(page);
  await page.getByTestId("profile-variable-typing").check();
  await expect(cell(page, "synthetic", "playCount")).toHaveText("2");
});

test("builder lists the five new CAPTCHAs with their own variants", async ({ page }) => {
  await page.goto("/builder?lang=en");
  for (const [captcha, variants] of [["shape-matching", ["exact", "pattern"]], ["math-logic", ["arithmetic", "comparison"]], ["sequence", ["number", "visual"]], ["memory", ["sequence", "position"]], ["audio", ["spoken-digits", "noisy-digits"]]] as const) {
    await page.getByTestId("builder-captcha").selectOption(captcha);
    await expect(page.getByTestId("builder-preview")).toBeVisible();
    const values = await page.getByTestId("builder-variant").locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(values).toEqual([...variants]);
  }
  await page.getByTestId("builder-captcha").selectOption("memory");
  await expect(page.getByTestId("mem-start")).toBeVisible();
});

test("experiments: a memory experiment round-trips with its recall context", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await page.goto("/experiments?lang=en&captcha=memory&variant=sequence&difficulty=easy&seed=21");
  await expect(page.getByTestId("exp-definition")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await recordMemory(page);
  await page.getByTestId("exp-add-recorded").click();
  await page.getByTestId("exp-syn-profile").selectOption("uniform-interval");
  await page.getByTestId("exp-syn-runs").fill("4");
  await page.getByTestId("exp-add-synthetic").click();
  await expect(page.getByTestId("exp-shown-count")).toContainText("5 of 5");
  const snap = () => page.evaluate(() => ({
    labels: Array.from(document.querySelectorAll('[data-testid^="sample-label-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.getAttribute("data-label")}`),
    stats: Array.from(document.querySelectorAll('[data-testid^="stat-"]')).map((e) => `${e.getAttribute("data-testid")}=${e.textContent}`),
  }));
  const before = await snap();
  const [d] = await Promise.all([page.waitForEvent("download"), page.getByTestId("exp-download-bundle").click()]);
  const text = readFileSync((await d.path()), "utf-8");
  expect(JSON.parse(text)).toMatchObject({ challenge: { captcha: "memory" }, recorded: [{ context: { recallStartMs: expect.any(Number) } }] });
  await page.reload();
  await expect(page.getByTestId("exp-shown-count")).toContainText("0 of 0");
  await page.getByTestId("exp-import-file").setInputFiles({ name: d.suggestedFilename(), mimeType: "application/json", buffer: Buffer.from(text) });
  await expect(page.getByTestId("exp-shown-count")).toContainText("5 of 5");
  expect(await snap()).toEqual(before);
});

test("privacy: the new CAPTCHAs in Compare send no data and write nothing", async ({ page }) => {
  await page.goto("/compare?captcha=shape-matching&seed=21&variant=exact&difficulty=easy");
  await expect(page.getByTestId("compare-pending")).toBeVisible();
  const assertNoDataLeft = await watchPrivacy(page);
  for (const s of SM.sources) {
    await page.getByTestId(`source-${s.id}`).click();
    await page.getByTestId(`target-${SM.matches[s.id]!}`).click();
  }
  await page.getByTestId("verify").click();
  await generate(page);
  await page.getByTestId("distribution-generate").click();
  await page.getByTestId("evaluation-run").click();
  await expect(label(page, "human")).toBeVisible();
  await assertNoDataLeft();
});
