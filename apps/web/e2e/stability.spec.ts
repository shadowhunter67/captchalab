import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";
import { expectValidIds, idProblems } from "./a11y";
import { TAXONOMY } from "../lib/taxonomy";

const PAGES = [
  "/",
  "/playground",
  "/learn",
  "/behavior",
  "/compare",
  "/builder",
  "/experiments",
  "/experiments/dataset",
  "/experiments/evaluation",
  "/behavior/invisible",
  ...TAXONOMY.map((e) => e.route),
];

for (const width of [1000, 400, 390, 360]) {
  test(`every public route has valid ids/ARIA, no console error and no horizontal overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const bad: string[] = [];
    for (const route of PAGES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const p = await idProblems(page);
      if (p.duplicates.length || p.broken.length) bad.push(`${route}: ${JSON.stringify(p)}`);
      if (width <= 400 && p.overflow > 0) bad.push(`${route}: horizontal overflow ${p.overflow}px`);
    }
    expect(bad).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("with a result and Inspect open at 390px: ids are valid and nothing overflows sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const check = async (): Promise<void> => {
    await expect(page.getByTestId("inspect")).toBeVisible();
    await expectValidIds(page);
    expect((await idProblems(page)).overflow, "horizontal overflow").toBe(0);
  };
  await page.goto("/playground/browser-capability?seed=3");
  await page.getByTestId("bc-run").click();
  await check();
  await page.goto("/playground/proof-of-work?seed=3&difficulty=easy");
  await page.getByTestId("pow-start").click();
  await check();
  await page.goto("/playground/proof-of-space?seed=3&difficulty=easy");
  await page.getByTestId("pos-start").click();
  await check();
  await page.goto("/playground/checkbox?seed=3");
  await page.getByTestId("checkbox-input").click();
  await check();
});

test("Hybrid keeps every id unique and every ARIA reference inside its own stage", async ({ page }) => {
  for (const kind of ["pow-visual", "pow-audio"]) {
    await page.goto(`/playground/hybrid?kind=${kind}&seed=41`);
    await page.getByTestId("stage-pow").getByTestId("pow-start").click();
    await expect(page.getByTestId("stage-pow").getByTestId("inspect")).toBeVisible();
    await expectValidIds(page);
    // Each stage's headings carry that stage's prefix, so a label can never resolve into the other stage.
    const labelled = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[aria-labelledby]")).map((el) => {
        const target = document.getElementById(el.getAttribute("aria-labelledby") ?? "");
        const stage = (n: Element | null) => n?.closest("[data-testid^='stage-']")?.getAttribute("data-testid") ?? "";
        return stage(el) === stage(target) ? null : `${el.getAttribute("aria-labelledby")}: ${stage(el)} -> ${stage(target)}`;
      }).filter(Boolean),
    );
    expect(labelled).toEqual([]);
  }
});

test("changing difficulty or seed discards the result and every running state (PoS, Browser Capability, MatchKey)", async ({ page }) => {
  await page.goto("/playground/proof-of-space?seed=5&variant=sampled&difficulty=easy");
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.getByTestId("difficulty-medium").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("pos-start")).toBeEnabled();

  await page.goto("/playground/browser-capability?seed=5&variant=basic&difficulty=easy");
  await page.getByTestId("bc-run").click();
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.getByTestId("seed-input").fill("77");
  await page.getByTestId("seed-apply").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("bc-checks")).toHaveCount(0);
  await expect(page.getByTestId("bc-run")).toBeEnabled();

  await page.goto("/playground/match-key?seed=5&variant=exact&difficulty=easy");
  await page.getByTestId("difficulty-medium").click();
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

test("a bad query (seed, variant, difficulty, kind) falls back to a working page with no error text", async ({ page }) => {
  for (const url of [
    "/playground/proof-of-space?seed=abc&variant=zzz&difficulty=zzz",
    "/playground/browser-capability?seed=-1&variant=zzz",
    "/playground/match-key?seed=99999999999999&variant=%00",
    "/playground/tile-game?difficulty=impossible",
    "/playground/hybrid?kind=nope&seed=%3Cscript%3E",
    "/playground/slider?seed=1e999",
  ]) {
    await page.goto(url);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByText(/Application error|Unhandled|TypeError|at \w+ \(/)).toHaveCount(0);
    await expectValidIds(page);
  }
});

test("privacy: Invisible Lab and Adaptive Lab send nothing, store nothing and log nothing", async ({ page }) => {
  await page.goto("/playground/adaptive");
  const assertAdaptive = await watchPrivacy(page);
  await page.getByTestId("adaptive-profile-variable").click();
  await expect(page.getByTestId("adaptive-escalation")).toBeVisible();
  await assertAdaptive();

  await page.goto("/playground/invisible");
  const assertInvisible = await watchPrivacy(page);
  await page.getByTestId("invisible-start").focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId("invisible-target")).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  await assertInvisible();
});

test("Learn explains Hybrid, Invisible Lab and Adaptive Lab, including what they do not prove", async ({ page }) => {
  await page.goto("/learn");
  for (const id of ["hybrid-pow-visual", "hybrid-pow-audio", "invisible", "adaptive"]) {
    const sec = page.getByTestId(`learn-lab-${id}`);
    await expect(sec).toBeVisible();
    for (const h of ["What it is", "How CaptchaLab implements it", "What it measures", "What it does NOT prove", "Privacy", "Limitations"]) {
      await expect(sec.getByRole("heading", { name: h })).toBeVisible();
    }
  }
  await expect(page.getByTestId("learn-lab-adaptive")).toContainText("Nothing is blocked, redirected or restricted");
});

test("Start, then New challenge / difficulty change: the old PoW and PoS run never touches the new challenge", async ({ page }) => {
  test.setTimeout(90_000);
  // Proof of Work: a hard run that takes a while, then a new challenge while it works.
  const { generatePowChallenge, searchNonces } = await import("@captchalab/captcha-plugins");
  const { createRng } = await import("@captchalab/captcha-core");
  let seed = 0;
  for (; seed <= 60; seed++) if (searchNonces(generatePowChallenge({ rng: createRng(seed), variantId: "hash-prefix", difficulty: "hard" }), 0, 150000) === null) break;
  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await page.getByTestId("pow-start").click();
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "running");
  await page.getByRole("button", { name: "New challenge" }).click();
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
  await expect(page.getByTestId("pow-start")).toBeEnabled();

  await page.goto(`/playground/proof-of-work?seed=${seed}&variant=hash-prefix&difficulty=hard`);
  await page.getByTestId("pow-start").click();
  await page.getByTestId("difficulty-easy").click();
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1000);
  await expect(page.getByTestId("pow-status")).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);

  // Proof of Space: a stretched 4 MB run, then a new challenge and a seed change while it works.
  const stretch = () =>
    page.evaluate(() => {
      const origNow = performance.now.bind(performance);
      performance.now = () => origNow() * 100;
      const origSet = window.setTimeout.bind(window);
      (window as unknown as { setTimeout: unknown }).setTimeout = (fn: TimerHandler, ms?: number, ...args: unknown[]) => origSet(fn, ms === 0 ? 100 : ms, ...args);
    });
  await page.goto("/playground/proof-of-space?seed=5&variant=checksum&difficulty=hard");
  await expect(page.getByTestId("pos-start")).toBeEnabled();
  await stretch();
  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "running");
  await page.getByTestId("pos-new").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);

  await page.getByTestId("pos-start").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "running");
  await page.getByTestId("seed-input").fill("99");
  await page.getByTestId("seed-apply").click();
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("pos-status")).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("inspect")).toHaveCount(0);
});

test("no broken internal link: every same-site link on every public page answers 200 and every #anchor exists", async ({ page, request }) => {
  test.setTimeout(240_000);
  const entry = ["/", "/playground", "/learn", "/behavior", "/compare", "/builder", "/experiments", "/experiments/dataset", "/experiments/evaluation", "/behavior/invisible", ...TAXONOMY.map((e) => e.route)];
  const links = new Map<string, string>(); // "pathname+search" -> first page it was seen on
  const anchors = new Map<string, string>(); // "pathname#id" -> page
  const rootAnchors = new Map<string, string>(); // "#id" on "/" -> page
  for (const route of entry) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const found = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => {
        const u = new URL((a as HTMLAnchorElement).href, location.href);
        return u.origin === location.origin ? { path: u.pathname + u.search, hash: u.hash.slice(1) } : null;
      }),
    );
    for (const l of found) {
      if (!l) continue;
      if (!links.has(l.path)) links.set(l.path, route);
      if (!l.hash) continue;
      if (l.path.split("?")[0] === "/") rootAnchors.set(l.hash, route); // the home shell opens the item named by the hash
      else anchors.set(`${l.path}#${l.hash}`, route);
    }
  }
  const dead: string[] = [];
  for (const [path, from] of links) {
    const res = await request.get(path.includes("lang=") ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`);
    if (res.status() !== 200) dead.push(`${path} (from ${from}): HTTP ${res.status()}`);
  }
  const missing: string[] = [];
  for (const [key, from] of anchors) {
    const [path, id] = key.split("#") as [string, string];
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    if ((await page.locator(`[id="${id}"]`).count()) === 0) missing.push(`${key} (from ${from})`);
  }
  const shellItems = new Set<string>([...TAXONOMY.map((e) => e.id as string), "behavior", "builder", "experiments", "compare", "learn"]);
  for (const [id, from] of rootAnchors) if (!shellItems.has(id)) missing.push(`/#${id} (from ${from}) is not a home item`);
  expect(dead).toEqual([]);
  expect(missing).toEqual([]);
  expect(links.size).toBeGreaterThan(20);
});
