import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { MAX_WORKLOAD, MIN_WORKLOAD } from "./capability";
import type { BcChallenge } from "./types";
import { BC_CHECK_ORDER, BC_VARIANTS } from "./variants";

export function generateBcChallenge({ rng, variantId, difficulty }: GenerateContext): BcChallenge {
  const { config, challengeConfig } = resolveVariant(BC_VARIANTS, { variantId, difficulty });
  assertRange("browser capability workload", config.workload, MIN_WORKLOAD, MAX_WORKLOAD);
  assertRange("browser capability checks", config.checks, 1, BC_CHECK_ORDER.length);
  const seed = Math.floor(rng() * 0x100000000) >>> 0;
  const id = `browser-capability-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, seed, checks: BC_CHECK_ORDER.slice(0, config.checks), workload: config.workload, config: challengeConfig };
}
