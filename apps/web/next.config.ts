import type { NextConfig } from "next";

// GitHub Pages build: `PAGES_BASE_PATH=/captchalab` exports static files under that path.
// Without it (dev, CI tests, `next start`) the app is built as usual.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@captchalab/captcha-core", "@captchalab/captcha-plugins"],
  reactStrictMode: true,
  ...(pagesBasePath ? { output: "export" as const, basePath: pagesBasePath, trailingSlash: true } : {}),
};

export default config;
