import type { GenerateContext } from "@captchalab/captcha-core";
import type { RotationChallenge } from "./types";

export const ROTATION_TOLERANCE_DEG = 12;
/** Initial angles stay clear of upright so the challenge is never already solved. */
export const ROTATION_MIN_INITIAL = 40;
export const ROTATION_MAX_INITIAL = 320;

/** Same seed, same challenge. No clock, no Math.random. */
export function generateRotationChallenge({ rng }: GenerateContext): RotationChallenge {
  const initialAngle = Math.round(ROTATION_MIN_INITIAL + rng() * (ROTATION_MAX_INITIAL - ROTATION_MIN_INITIAL));
  const id = `rotation-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  return { id, initialAngle, targetAngle: 0, tolerance: ROTATION_TOLERANCE_DEG };
}
