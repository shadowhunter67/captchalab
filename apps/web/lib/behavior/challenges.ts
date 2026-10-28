import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { stampSeed, type VariantChoice } from "@/lib/useSeededChallenge";
import type { BehaviorCaptchaId } from "./types";

type Generate = (seed: number, choice: VariantChoice) => unknown;

const gen = (id: BehaviorCaptchaId): Generate => (seed, choice) =>
  stampSeed(
    (registry.get(id) as unknown as { generate: (c: { rng: () => number; variantId: string; difficulty: VariantChoice["difficulty"] }) => { config?: never } }).generate({
      rng: createRng(seed),
      variantId: choice.variantId,
      difficulty: choice.difficulty,
    }),
    seed,
  );

/**
 * Module-level (stable) generators, one per supported CAPTCHA: useSeededChallenge needs a stable function.
 * They are the plugins' own generators, so Compare uses exactly the challenge a playground would.
 */
export const CHALLENGE_GENERATORS: Readonly<Record<BehaviorCaptchaId, Generate>> = {
  slider: gen("slider"),
  "drag-drop": gen("drag-drop"),
  checkbox: gen("checkbox"),
  "image-grid": gen("image-grid"),
  text: gen("text"),
  rotation: gen("rotation"),
  "shape-matching": gen("shape-matching"),
  "math-logic": gen("math-logic"),
  sequence: gen("sequence"),
  memory: gen("memory"),
  audio: gen("audio"),
};
