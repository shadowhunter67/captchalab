import { defineConfig } from "@playwright/test";

const PORT = 3100; // not 3000: avoid clashing with other local servers

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome", // use the installed Chrome instead of downloading a browser
    viewport: { width: 1000, height: 800 },
  },
  webServer: {
    command: `corepack pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/playground/slider`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
