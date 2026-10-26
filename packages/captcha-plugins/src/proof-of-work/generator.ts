import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import type { PowChallenge } from "./types";
import { POW_VARIANTS } from "./variants";

const hex8 = (n: number): string => Math.floor(n * 0x100000000).toString(16).padStart(8, "0");

/**
 * Same seed + variant + difficulty, same challenge text; searching from nonce 0 therefore always finds the same
 * first valid nonce. Nothing is computed here: the work is what the user runs.
 */
export function generatePowChallenge({ rng, variantId, difficulty }: GenerateContext): PowChallenge {
  const { variant, config, challengeConfig } = resolveVariant(POW_VARIANTS, { variantId, difficulty });
  const input = `${hex8(rng())}${hex8(rng())}`;
  const id = `proof-of-work-${hex8(rng())}`;
  if (variant.id === "leading-zero-bits") {
    assertRange("proof of work bits", config.bits, 4, 20);
    return { id, input, algorithm: "SHA-256", kind: "bits", prefix: "", bits: config.bits, config: challengeConfig };
  }
  if (!/^0{1,4}$/.test(config.prefix)) throw new RangeError("proof of work prefix must be one to four zeros");
  return { id, input, algorithm: "SHA-256", kind: "prefix", prefix: config.prefix, bits: 0, config: challengeConfig };
}
