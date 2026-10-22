import { defineConfig } from "@playwright/test";

const PORT = 3100; // not 3000: avoid clashing with other local servers
const CI = process.env.CI === "true"; // "false"/"0"/empty must not enable CI mode
// Locally the installed Chrome is used (no browser download). In CI (or when PLAYWRIGHT_CHANNEL is
// empty) Playwright's own Chromium is used, installed by `playwright install chromium`.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (CI ? undefined : "chrome");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: CI,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...(channel ? { channel } : {}),
    viewport: { width: 1000, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // CI tests the production build (`next build` runs first); locally the dev server is used.
    command: CI ? `corepack pnpm exec next start -p ${PORT}` : `corepack pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/playground/slider`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
