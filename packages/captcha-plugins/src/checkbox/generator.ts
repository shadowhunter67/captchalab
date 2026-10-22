import type { GenerateContext } from "@captchalab/captcha-core";
import type { CheckboxChallenge } from "./types";

/**
 * The challenge itself has nothing to randomize (the user must check the box), so the seeded rng
 * only provides a stable identity. Same seed, same challenge; no clock, no Math.random.
 */
export function generateCheckboxChallenge({ rng }: GenerateContext): CheckboxChallenge {
  const id = `checkbox-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  return { id, expectedChecked: true };
}
