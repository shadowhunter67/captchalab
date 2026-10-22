import type { GenerateContext } from "@captchalab/captcha-core";
import type { SliderChallenge } from "./types";

/** Keep targets away from the edges: near 0 is trivial, near 1 is awkward to hit. */
export const SLIDER_TARGET_MIN = 0.25;
export const SLIDER_TARGET_MAX = 0.9;
/** Normalized; about 6px on a 300px travel. */
export const SLIDER_DEFAULT_TOLERANCE = 0.02;

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Pure function of the rng stream: same seed, same challenge. No clock, no Math.random. */
export function generateSliderChallenge({ rng }: GenerateContext): SliderChallenge {
  const target = round4(SLIDER_TARGET_MIN + rng() * (SLIDER_TARGET_MAX - SLIDER_TARGET_MIN));
  const id = `slider-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  return { id, target, tolerance: SLIDER_DEFAULT_TOLERANCE };
}
