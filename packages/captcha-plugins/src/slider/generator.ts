import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { ART_CATEGORIES, ART_SCENES_FOR, type ArtCategory } from "../shared/art";
import type { SliderChallenge } from "./types";
import { SLIDER_VARIANTS } from "./variants";

/** Keep targets away from the edges: near 0 is trivial, near 1 is awkward to hit. */
export const SLIDER_TARGET_MIN = 0.25;
export const SLIDER_TARGET_MAX = 0.9;
/** Normalized; about 6px on a 300px travel. */
export const SLIDER_DEFAULT_TOLERANCE = 0.02;

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Pure function of the rng stream: same seed, same challenge. No clock, no Math.random. */
export function generateSliderChallenge({ rng, variantId, difficulty }: GenerateContext): SliderChallenge {
  const { config, challengeConfig } = resolveVariant(SLIDER_VARIANTS, { variantId, difficulty });
  assertRange("slider tolerance", config.tolerance, 0.005, 0.1);
  const target = round4(SLIDER_TARGET_MIN + rng() * (SLIDER_TARGET_MAX - SLIDER_TARGET_MIN));
  const id = `slider-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  if (challengeConfig.variantId !== "puzzle") return { id, target, tolerance: config.tolerance, config: challengeConfig };
  // The puzzle picture draws on the rng AFTER the fields above, so the classic and precision variants are unchanged.
  const category = ART_CATEGORIES[Math.floor(rng() * ART_CATEGORIES.length)] as ArtCategory;
  const scenes = ART_SCENES_FOR[category];
  const puzzle = { category, seed: Math.floor(rng() * 1_000_000), scene: scenes[Math.floor(rng() * scenes.length)]!, y: round4(0.22 + rng() * 0.38) };
  return { id, target, tolerance: config.tolerance, puzzle, config: challengeConfig };
}
