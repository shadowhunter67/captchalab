import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";

const LABELS = ["human-like", "synthetic-like", "uncertain"];
const start = (page: Page) => page.getByTestId("invisible-start");
const target = (page: Page) => page.getByTestId("invisible-target");

/** Click the moving target `n` times with a little travel between clicks. */
async function clickTargets(page: Page, n = 4) {
  for (let i = 0; i < n; i++) {
    await target(page).scrollIntoViewIfNeeded();
    const b = (await target(page).boundingBox())!;
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await page.mouse.move(x - 60, y - 30, { steps: 8 });
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.down();
    await page.mouse.up();
  }
}

test("/behavior: what the lab is, what it is not, the three calls to action", async ({ page }) => {
  await page.goto("/behavior");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Behavioral Lab");
  await expect(page.getByTestId("cta-record")).toHaveAttribute("href", /\/compare\/?\?captcha=slider/);
  await expect(page.getByTestId("cta-compare")).toHaveAttribute("href", /\/compare\/?$/);
  await expect(page.getByTestId("cta-signals")).toHaveAttribute("href", "#signals");
  await expect(page.getByTestId("research-disclaimer")).toContainText("must not be interpreted as proof that a person is human or automated");
  await expect(page.getByTestId("behavior-not")).toContainText("not a production authentication system");
  await expect(page.getByTestId("behavior-supported").locator("li")).toHaveCount(11);
  await expect(page.getByTestId("behavior-excluded")).toContainText("Proof of Work")
  await expect(page.getByTestId("behavior-groups")).toContainText("Timing");
  for (const g of ["Timing", "Motion", "Correction", "Rhythm", "Attempts", "Input"]) await expect(page.getByTestId("behavior-groups")).toContainText(g);
  await expect(page.getByTestId("behavior-privacy")).toContainText("no device fingerprinting");
  const text = (await page.locator("main").textContent()) ?? "";
  expect(text).not.toMatch(/\d\s*%\s*(bot|human)/i);
  expect(text).not.toContain("CaptchaLab detects bots");
});

test("/behavior: the signal explorer follows the chosen CAPTCHA and shows its configured rules", async ({ page }) => {
  await page.goto("/behavior");
  await page.getByTestId("cta-signals").click();
  await expect(page.getByTestId("signals-explorer")).toBeVisible();
  await expect(page.getByTestId("explorer-signals")).toContainText("Velocity variation");
  await page.getByTestId("explorer-select").selectOption("text");
  await expect(page.getByTestId("explorer-signals")).toContainText("Typing rhythm variation");
  await expect(page.getByTestId("explorer-signals")).not.toContainText("Velocity variation");
  await expect(page.getByTestId("explorer-rules")).toContainText("Typing rhythm variation");
  await expect(page.getByTestId("signals-explorer")).toContainText("not population percentiles");
});

test("/behavior: the invisible demo is linked and the record CTA opens Compare on the slider", async ({ page }) => {
  await page.goto("/behavior");
  await page.getByTestId("cta-record").click();
  await expect(page).toHaveURL(/compare\/?\?captcha=slider/);
  await expect(page.getByTestId("slider-handle")).toBeVisible();
  await page.goto("/behavior");
  await page.getByTestId("cta-invisible").click();
  await expect(page).toHaveURL(/behavior\/invisible/);
});

test("invisible: nothing is recorded or shown until Start; scope is stated", async ({ page }) => {
  await page.goto("/behavior/invisible");
  await expect(page.getByTestId("invisible-scope")).toContainText("Nothing is recorded before you press Start");
  await expect(page.getByTestId("invisible-pad")).toHaveCount(0);
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
  await page.mouse.move(200, 200, { steps: 5 });
  await page.mouse.click(210, 210);
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
  await start(page).click();
  await expect(page.getByTestId("invisible-pad")).toBeVisible();
  await expect(page.getByTestId("invisible-progress")).toHaveText("Target 1 of 4");
});

test("invisible: a pointer run is recorded in the pad, classified, and an escalation is only suggested", async ({ page }) => {
  await page.goto("/behavior/invisible");
  const url = page.url();
  await start(page).click();
  await clickTargets(page, 4);
  await expect(page.getByTestId("invisible-done")).toBeVisible();
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  const label = await page.getByTestId("invisible-class-label").getAttribute("data-label");
  expect(LABELS).toContain(label);
  await expect(page.getByTestId("invisible-class-evidence").locator("li").first()).toBeVisible();
  const esc = await page.getByTestId("escalation-text").getAttribute("data-escalation");
  expect(esc).toBe(label === "human-like" ? "none" : label === "uncertain" ? "checkbox" : "slider");
  await expect(page.getByTestId("escalation-note")).toContainText("simulation only");
  await expect(page.getByTestId("escalation-note")).toContainText("Nothing is blocked, redirected or restricted");
  await expect(page.getByText("Experimental escalation suggestion")).toBeVisible();
  await expect(page.getByTestId("classifier-disclaimer")).toContainText("does not prove whether a real user is human or automated");
  // Nothing navigated and nothing was blocked.
  expect(page.url()).toBe(url);
  await expect(page.getByText(/access denied/i)).toHaveCount(0);
  await expect(page.getByTestId("invisible-signals")).toContainText("Mean time between selections");
});

test("invisible: keyboard only (focus follows the target, Enter) completes the run; pointer signals are absent, not zero", async ({ page }) => {
  await page.goto("/behavior/invisible");
  await start(page).focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 4; i++) {
    await expect(target(page)).toBeFocused();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  // Machine-regular key presses read as such; what matters here is that no pointer signal is invented.
  const label = await page.getByTestId("invisible-class-label").getAttribute("data-label");
  expect(LABELS).toContain(label);
  await expect(page.getByTestId("escalation-text")).toHaveAttribute("data-escalation", label === "human-like" ? "none" : label === "uncertain" ? "checkbox" : "slider");
  const row = (name: string) => page.getByTestId("invisible-signals").getByRole("row", { name: new RegExp(name) });
  await expect(row("Velocity variation")).toContainText("—");
  await expect(row("Pointer distance")).toContainText("—");
  await expect(row("Attempts")).toContainText("4");
  expect(await page.getByTestId("invisible-class-evidence").locator("li").count()).toBeLessThanOrEqual(4);
});

test("invisible: reset clears the sample; stop discards a run in progress", async ({ page }) => {
  await page.goto("/behavior/invisible");
  await start(page).click();
  await clickTargets(page, 2);
  await expect(page.getByTestId("invisible-progress")).toHaveText("Target 3 of 4");
  await page.getByTestId("invisible-cancel").click();
  await expect(page.getByTestId("invisible-pad")).toHaveCount(0);
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
  await start(page).click();
  await clickTargets(page, 4);
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  await page.getByTestId("invisible-reset").click();
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
  await expect(start(page)).toBeVisible();
});

test("invisible: generated examples show every escalation outcome, with no navigation", async ({ page }) => {
  await page.goto("/behavior/invisible");
  const url = page.url();

  await page.getByTestId("invisible-synth-regular").click();
  await expect(page.getByTestId("invisible-class-label")).toHaveAttribute("data-label", "synthetic-like");
  await expect(page.getByTestId("escalation-text")).toHaveAttribute("data-escalation", "slider");
  await expect(page.getByTestId("escalation-text")).toHaveText("A Slider demo is suggested.");
  await expect(page.getByTestId("invisible-synthetic-meta")).toContainText("synthetic@1");

  await page.getByTestId("invisible-synth-mixed").click();
  await expect(page.getByTestId("invisible-class-label")).toHaveAttribute("data-label", "uncertain");
  await expect(page.getByTestId("escalation-text")).toHaveAttribute("data-escalation", "checkbox");

  await page.getByTestId("invisible-synth-variable").click();
  await expect(page.getByTestId("invisible-class-label")).toHaveAttribute("data-label", "human-like");
  await expect(page.getByTestId("escalation-text")).toHaveText("No extra challenge selected.");
  await expect(page.getByTestId("escalation-link")).toHaveCount(0);

  expect(page.url()).toBe(url);
  await page.getByTestId("invisible-reset").click();
  await expect(page.getByTestId("invisible-result")).toHaveCount(0);
});

test("privacy: /behavior and the invisible demo write nothing, send nothing, log nothing", async ({ page }) => {
  await page.goto("/behavior");
  let assertNoDataLeft = await watchPrivacy(page);
  await page.getByTestId("explorer-select").selectOption("rotation");
  await assertNoDataLeft();

  await page.goto("/behavior/invisible");
  assertNoDataLeft = await watchPrivacy(page);
  await start(page).click();
  await clickTargets(page, 4);
  await expect(page.getByTestId("invisible-result")).toBeVisible();
  await page.getByTestId("invisible-synth-regular").click();
  await page.getByTestId("invisible-reset").click();
  await assertNoDataLeft();
});

test("privacy: no fingerprinting APIs are touched by the lab pages", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __fp: string[] };
    w.__fp = [];
    const note = (what: string) => () => void w.__fp.push(what);
    HTMLCanvasElement.prototype.toDataURL = ((orig) => function (this: HTMLCanvasElement, ...a: Parameters<typeof orig>) { note("canvas.toDataURL")(); return orig.apply(this, a); })(HTMLCanvasElement.prototype.toDataURL);
    HTMLCanvasElement.prototype.getContext = ((orig) => function (this: HTMLCanvasElement, ...a: Parameters<typeof orig>) { if (String(a[0]).includes("webgl")) note("webgl")(); return orig.apply(this, a as never); })(HTMLCanvasElement.prototype.getContext) as never;
    if (document.fonts && "check" in document.fonts) document.fonts.check = ((orig) => function (this: FontFaceSet, ...a: Parameters<typeof orig>) { note("fonts.check")(); return orig.apply(this, a); })(document.fonts.check);
  });
  for (const url of ["/behavior", "/compare?captcha=checkbox&seed=777", "/behavior/invisible"]) {
    await page.goto(url);
    if (url.startsWith("/compare")) {
      await page.getByTestId("checkbox-input").click();
      await page.getByTestId("generate").click();
    }
    if (url.endsWith("invisible")) await page.getByTestId("invisible-synth-mixed").click();
    const used = await page.evaluate(() => (window as unknown as { __fp: string[] }).__fp);
    expect(used, url).toEqual([]);
  }
});

test("Learn has a Behavioral / Invisible section that is a lab module, not a thirteenth CAPTCHA", async ({ page }) => {
  await page.goto("/learn");
  const section = page.getByTestId("learn-behavioral");
  await expect(section).toBeVisible();
  for (const topic of ["Behavioral signals", "Risk-based challenge escalation", "Uncertainty", "False positives and false negatives", "Privacy", "Limitations"]) {
    await expect(section.getByRole("heading", { name: topic })).toBeVisible();
  }
  await expect(section).toContainText("never shows a percentage");
  await expect(page.getByTestId("learn-behavioral-link")).toHaveAttribute("href", /behavior/);
  await page.goto("/playground");
  await expect(page.locator('[data-testid^="open-"]')).toHaveCount(12);
});

test("home: Behavior sits in the Research group and opens in the preview", async ({ page }) => {
  await page.goto("/#behavior");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByTestId("cta-signals")).toBeAttached();
  await page.getByTestId("pick-compare").click();
  await expect(frame.getByTestId("captcha-select")).toBeAttached();
  await page.getByTestId("pick-behavior").click();
  await expect(frame.getByTestId("signals-explorer")).toBeAttached();
});
