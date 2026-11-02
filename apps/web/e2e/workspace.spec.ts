import { idProblems } from "./a11y";
import { expect, test } from "./fixtures";

const ROUTES = ["text", "image-grid", "slider", "memory", "audio", "proof-of-work", "hybrid-pow-visual"] as const;

test("the workspace has five tabs with valid ARIA relationships and no duplicate ids", async ({ page }) => {
  await page.goto("/#text");
  await expect(page.getByRole("tab")).toHaveCount(5 + 3); // five workspace tabs + three inspector tabs
  const bad = await idProblems(page);
  expect(bad).toEqual({ duplicates: [], broken: [], overflow: 0 });
});

test("workspace tabs: Arrow keys, Home and End move the selection and focus", async ({ page }) => {
  await page.goto("/#text");
  const first = page.getByTestId("tab-experience");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("tab-events")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("tab-events")).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByTestId("tab-learn")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("panel-learn")).toBeVisible();
  await page.keyboard.press("ArrowRight"); // wraps
  await expect(page.getByTestId("tab-experience")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft"); // wraps back
  await expect(page.getByTestId("tab-learn")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(page.getByTestId("tab-experience")).toBeFocused();
});

test("Learn lives in its own tab and is no longer repeated under the challenge", async ({ page }) => {
  await page.goto("/#text");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByTestId("text-image")).toBeVisible();
  await expect(frame.getByTestId("learn")).toHaveCount(0);
  await expect(page.getByText("How it works and its limits")).toHaveCount(0);
  await page.getByTestId("tab-learn").click();
  await expect(page.getByTestId("panel-learn").getByTestId("learn")).toContainText("Learn: the text CAPTCHA");
  await expect(page.getByTestId("learn-realism-text")).toBeVisible();
  // The standalone page keeps its own Learn block.
  await page.goto("/playground/text/");
  await expect(page.getByTestId("learn")).toBeVisible();
});

test("switching tabs keeps the challenge, the typed answer, the session and the Inspector", async ({ page }) => {
  await page.goto("/#text");
  const frame = page.frameLocator('[data-testid="preview"]');
  await expect(frame.getByTestId("seed-input")).not.toHaveValue(""); // hydrated
  const seed = await frame.getByTestId("seed-input").inputValue();
  await frame.getByTestId("text-answer").fill("abc");
  await page.getByTestId("tab-learn").click();
  await page.getByTestId("tab-experience").click();
  await expect(frame.getByTestId("text-answer")).toHaveValue("abc");
  await expect(frame.getByTestId("seed-input")).toHaveValue(seed);

  await frame.getByTestId("verify").click();
  await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
  const events = await page.getByTestId("side-stat-events-value").textContent();
  for (const tab of ["tab-events", "tab-analysis", "tab-access", "tab-learn", "tab-experience"]) {
    await page.getByTestId(tab).click();
    await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
    await expect(page.getByTestId("side-stat-events-value")).toHaveText(events ?? "");
  }
  await expect(frame.getByTestId("text-answer")).toHaveValue("abc");
  await expect(frame.getByTestId("seed-input")).toHaveValue(seed);
  // The analysis tab carries the metric cards that used to sit under the challenge.
  await page.getByTestId("tab-analysis").click();
  await expect(page.getByTestId("main-stat-events-value")).toHaveText(events ?? "");
});

for (const id of ROUTES) {
  test(`representative route ${id}: Learn tab has content, the frame survives, no overflow`, async ({ page }) => {
    await page.goto(`/#${id}`);
    const frame = page.frameLocator('[data-testid="preview"]');
    await expect(frame.locator("main")).toBeVisible();
    await expect(frame.getByTestId("learn")).toHaveCount(0);
    await expect(frame.getByText("How it works and its limits")).toHaveCount(0);
    await page.getByTestId("tab-learn").click();
    await expect(page.getByTestId("panel-learn")).not.toBeEmpty();
    await expect(page.getByTestId("panel-learn").locator("h2, h3").first()).toBeVisible();
    await page.getByTestId("tab-experience").click();
    await expect(frame.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("a challenge started on the Try tab is still the same one after Learn and back (Image Grid, Slider)", async ({ page }) => {
  await page.goto("/#image-grid");
  const frame = page.frameLocator('[data-testid="preview"]');
  await frame.getByTestId("cell-c1").click();
  await page.getByTestId("tab-learn").click();
  await page.getByTestId("tab-experience").click();
  await frame.getByTestId("verify").click();
  await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
  await page.getByTestId("tab-learn").click();
  await expect(page.getByTestId("session-status")).toContainText(/Passed|Not passed/);
});

test("a tool page without a session shows plain empty states, not blank panels", async ({ page }) => {
  await page.goto("/#compare");
  await page.getByTestId("tab-analysis").click();
  await expect(page.getByTestId("analysis-empty")).toBeVisible();
  await page.getByTestId("tab-learn").click();
  await expect(page.getByTestId("learn-empty")).toBeVisible();
});

for (const [w, h] of [
  [1440, 900],
  [1000, 800],
  [400, 800],
  [390, 844],
  [360, 740],
] as const) {
  test(`layout at ${w}x${h}: no horizontal overflow, tabs reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/#text");
    await expect(page.frameLocator('[data-testid="preview"]').getByTestId("text-image")).toBeVisible();
    await page.getByTestId("tab-learn").scrollIntoViewIfNeeded();
    await page.getByTestId("tab-learn").click();
    await expect(page.getByTestId("panel-learn")).toBeVisible();
    const m = await page.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    }));
    expect(m.over).toBeLessThanOrEqual(0);
    if (w >= 1024) {
      // Desktop: the page itself does not grow with the Learn text; the active tab scrolls inside the workspace.
      expect(m.pageScrolls).toBe(false);
      const inner = await page.getByTestId("panel-learn").evaluate((el) => {
        const sc = el.parentElement as HTMLElement;
        return { scrollable: sc.scrollHeight > sc.clientHeight, fits: sc.clientHeight > 300 };
      });
      expect(inner.fits).toBe(true);
      expect(inner.scrollable).toBe(true);
    }
    await page.getByTestId("tab-experience").click();
    await expect(page.frameLocator('[data-testid="preview"]').getByTestId("text-image")).toBeVisible();
  });
}
