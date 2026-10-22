import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@captchalab/captcha-core", "@captchalab/captcha-plugins"],
  reactStrictMode: true,
};

export default config;
