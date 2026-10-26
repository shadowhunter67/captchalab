import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { BEHAVIOR_CAPTCHAS, type BehaviorCaptchaId } from "../types";

export { BEHAVIOR_CAPTCHAS };

/** The plugin's own challenge for a seed (the same objects the playgrounds use). */
export function challengeFor(id: BehaviorCaptchaId, seed = 7, variantId?: string, difficulty?: CaptchaDifficulty): never {
  return (registry.get(id) as unknown as { generate: (c: unknown) => unknown }).generate({ rng: createRng(seed), variantId, difficulty }) as never;
}
