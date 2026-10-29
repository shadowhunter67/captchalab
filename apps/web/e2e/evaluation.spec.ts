import { expect, test } from "./fixtures";
import { watchPrivacy } from "./privacy";

const COMPARE = "/compare?captcha=checkbox&seed=777&variant=basic&difficulty=medium";

test("evaluation: empty dataset says there is nothing to evaluate", async ({ page }) => {
  await page.goto("/experiments/evaluation");
  await expect(page.getByTestId("eval-empty")).toContainText("No eligible labeled sessions");
});

test("evaluation: unknown is excluded, labels drive the table, the sandbox never touches the baseline", async ({ page }) => {
  await page.goto(COMPARE);
  await page.getByTestId("checkbox-input").click();
  await page.getByTestId("add-recorded").click();
  await page.getByTestId("generate").click();
  await page.getByTestId("profile-regular-timing").check();
  await page.getByTestId("add-synthetic").click();
  await page.getByTestId("add-recorded-open").click();
  await page.getByTestId("ds-to-evaluation").click(); // client-side: the in-memory dataset is kept
  const assertNoDataLeft = await watchPrivacy(page);

  // d1 is Unknown (excluded), d2 is Synthetic.
  await expect(page.getByTestId("eval-eligible")).toHaveText("1");
  await expect(page.getByTestId("eval-excluded")).toHaveText("1");
  const baseCoverage = await page.getByTestId("eval-coverage").textContent();
  const baseAccuracy = await page.getByTestId("eval-accuracy").textContent();

  // Sandbox: wide thresholds make everything uncertain locally; the baseline numbers do not move.
  await page.getByTestId("eval-human-t").fill("1");
  await page.getByTestId("eval-synth-t").fill("1");
  await expect(page.getByTestId("eval-sb-coverage")).toHaveText("0.0%");
  await expect(page.getByTestId("eval-coverage")).toHaveText(baseCoverage ?? "");
  await expect(page.getByTestId("eval-accuracy")).toHaveText(baseAccuracy ?? "");
  await expect(page.getByTestId("eval-overfit")).toContainText("overfit");
  await expect(page.getByTestId("eval-classifier")).toContainText("behavioral-baseline@1");
  await page.getByTestId("eval-reset-t").click();
  await expect(page.getByTestId("eval-human-t-value")).toHaveText("0.20");
  await assertNoDataLeft(); // staying on the page: no request, console output or storage write

  // Labelling d1 Human (on the dataset page) makes it eligible.
  await page.getByRole("link", { name: "Open the dataset" }).click();
  await page.getByTestId("ds-label-d1").selectOption("human");
  await page.getByTestId("ds-to-evaluation").click();
  await expect(page.getByTestId("eval-eligible")).toHaveText("2");
  await expect(page.getByTestId("eval-excluded")).toHaveText("0");
  const cells = await Promise.all(["hh", "hs", "hu", "sh", "ss", "su"].map(async (c) => Number(await page.getByTestId(`eval-${c}`).textContent())));
  expect(cells.reduce((a, b) => a + b, 0)).toBe(2);
  await expect(page.getByTestId("eval-by-captcha-checkbox-insufficient")).toBeVisible(); // 2 records < minimum sample
});
