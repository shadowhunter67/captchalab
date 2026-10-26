import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import type { RotationChallenge } from "./types";
import { ROTATION_VARIANTS } from "./variants";

export const ROTATION_TOLERANCE_DEG = 12;
/** Initial angles stay clear of upright so the challenge is never already solved. */
export const ROTATION_MIN_INITIAL = 40;
export const ROTATION_MAX_INITIAL = 320;

/** Same seed + variant + difficulty, same challenge. No clock, no Math.random. */
export function generateRotationChallenge({ rng, variantId, difficulty }: GenerateContext): RotationChallenge {
  const { config, challengeConfig } = resolveVariant(ROTATION_VARIANTS, { variantId, difficulty });
  assertRange("rotation tolerance", config.toleranceDeg, 5, 45);
  assertRange("rotation minimum start", config.minInitialDeg, 20, 180);
  assertRange("rotation maximum start", config.maxInitialDeg, config.minInitialDeg, 340);
  const spread = Math.round(config.minInitialDeg + rng() * (config.maxInitialDeg - config.minInitialDeg));
  // randomSide draws one more number, but only for the variants that use it (the classic stream is unchanged).
  const initialAngle = config.randomSide ? (rng() < 0.5 ? spread : 360 - spread) % 360 : spread;
  const id = `rotation-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  return { id, initialAngle, targetAngle: 0, tolerance: config.toleranceDeg, config: challengeConfig };
}
