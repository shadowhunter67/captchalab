import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface BcVariantConfig {
  [key: string]: number | string;
  /** Number of checks, taken from the front of BC_CHECK_ORDER. */
  checks: number;
  workload: number;
}

/** Basic asks for the core APIs (the first 4); Extended adds the optional ones. Difficulty only grows the local computation. */
export const BC_CHECK_ORDER = ["javascript", "compute", "webcrypto", "canvas", "worker", "webaudio", "pointer"] as const;

export const BC_VARIANTS: CaptchaVariantSet<BcVariantConfig> = {
  variants: [
    {
      id: "basic",
      name: "Basic",
      description: "Check JavaScript, a small computation, Web Crypto and the Canvas API.",
      difficulties: {
        easy: { checks: 4, workload: 2_000 },
        medium: { checks: 4, workload: 20_000 },
        hard: { checks: 4, workload: 100_000 },
      },
    },
    {
      id: "extended",
      name: "Extended",
      description: "Also check Web Workers, the Web Audio API and Pointer Events.",
      difficulties: {
        easy: { checks: 7, workload: 2_000 },
        medium: { checks: 7, workload: 20_000 },
        hard: { checks: 7, workload: 100_000 },
      },
    },
  ],
  defaultSelection: { variantId: "basic", difficulty: "easy" },
};
