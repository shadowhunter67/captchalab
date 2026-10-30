import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { MAX_SAMPLES, MAX_SPACE_BYTES, MIN_SPACE_BYTES } from "./space";
import type { PosChallenge } from "./types";
import { POS_VARIANTS } from "./variants";

/**
 * Same seed + variant + difficulty, same challenge. Nothing is allocated or computed here: the work is what the user
 * runs.
 */
export function generatePosChallenge({ rng, variantId, difficulty }: GenerateContext): PosChallenge {
  const { variant, config, challengeConfig } = resolveVariant(POS_VARIANTS, { variantId, difficulty });
  assertRange("proof of space bytes", config.bytes, MIN_SPACE_BYTES, MAX_SPACE_BYTES);
  const seed = Math.floor(rng() * 0x100000000) >>> 0;
  const id = `proof-of-space-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  if (variant.id === "checksum") return { id, seed, bytes: config.bytes, kind: "checksum", sampleCount: 0, config: challengeConfig };
  assertRange("proof of space samples", config.sampleCount, 8, MAX_SAMPLES);
  return { id, seed, bytes: config.bytes, kind: "sample", sampleCount: config.sampleCount, config: challengeConfig };
}
