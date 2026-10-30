import { expect, test } from "./fixtures";
import { TAXONOMY, FAMILIES, countTaxonomy } from "../lib/taxonomy";

const counts = countTaxonomy();

test("Playground is grouped by family and its counts come from the taxonomy", async ({ page }) => {
  await page.goto("/playground");
  for (const f of FAMILIES) {
    const section = page.getByTestId(`family-${f}`);
    await expect(section).toBeVisible();
    await expect(section.getByRole("listitem")).toHaveCount(counts.byFamily[f]);
  }
  await expect(page.getByTestId("playground-cards").getByRole("listitem")).toHaveCount(TAXONOMY.length);
  await expect(page.getByTestId("playground-count")).toContainText(`${counts.total} lab entries`);
  for (const id of ["hybrid-pow-visual", "hybrid-pow-audio", "invisible", "adaptive", "browser-capability"]) {
    await expect(page.getByTestId(`open-${id}`)).toBeVisible();
  }
});

test("Playground opens a lab and keeps its place", async ({ page }) => {
  await page.goto("/playground");
  await page.getByTestId("open-adaptive").click();
  await expect(page).toHaveURL(/playground\/adaptive/);
});

test("Learn is grouped by family with anchors, and has the honest coverage matrix", async ({ page }) => {
  await page.goto("/learn");
  for (const f of FAMILIES) await expect(page.getByTestId(`learn-family-${f}`)).toBeVisible();
  await expect(page.getByTestId("learn-families").getByRole("link")).toHaveCount(FAMILIES.length + 2);
  const claim = page.getByTestId("coverage-claim");
  await expect(claim).toHaveText("CaptchaLab covers major CAPTCHA and anti-abuse challenge families through generic educational implementations.");
  await expect(page.getByTestId("coverage-matrix")).not.toContainText("100%");
  await expect(page.getByTestId("coverage-counts")).toContainText(`${counts.total} entries`);
  await expect(page.locator('[data-testid^="coverage-row-"]')).toHaveCount(TAXONOMY.length);
});

test("Coverage matrix: unsupported cells say so in words; supported ones are not claimed for new challenges", async ({ page }) => {
  await page.goto("/learn#coverage");
  const cls = (id: string) => page.getByTestId(`coverage-row-${id}`).locator('[data-col="classifier"]');
  await expect(cls("match-key")).toHaveText("Classifier support: —");
  await expect(cls("proof-of-space")).toHaveText("Classifier support: —");
  await expect(cls("browser-capability")).toHaveText("Classifier support: —");
  await expect(cls("slider")).toHaveText("Classifier support: Yes");
  await expect(cls("invisible")).toHaveText("Classifier support: Yes");
  await expect(cls("adaptive")).toHaveText("Classifier support: Yes");
  await expect(page.getByTestId("coverage-row-tile-game").locator('[data-col="builder"]')).toHaveText("—");
  await expect(page.getByTestId("coverage-row-slider").locator('[data-col="builder"]')).toHaveText("Yes");
  await expect(page.getByTestId("coverage-row-adaptive").locator('[data-col="inspect"]')).toHaveText("—");
});

test("Experiments, Dataset and Evaluation link to each other and mark the current page", async ({ page }) => {
  await page.goto("/experiments");
  await expect(page.getByTestId("experiments-nav-experiments")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("experiments-nav-dataset").click();
  await expect(page).toHaveURL(/experiments\/dataset/);
  await expect(page.getByTestId("experiments-nav-dataset")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("experiments-nav-evaluation").click();
  await expect(page).toHaveURL(/experiments\/evaluation/);
  await expect(page.getByTestId("experiments-nav-evaluation")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("experiments-nav-experiments").click();
  await expect(page).toHaveURL(/\/experiments\/?$/);
});

test("The home sidebar groups by family and opens a lab", async ({ page }) => {
  await page.goto("/#invisible");
  await expect(page.getByRole("navigation").getByText("Behavioral").first()).toBeVisible();
  await expect(page.getByRole("navigation").getByText("Hybrid").first()).toBeVisible();
});
