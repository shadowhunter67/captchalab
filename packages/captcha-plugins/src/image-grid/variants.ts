import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface ImageGridVariantConfig {
  [key: string]: number | string;
  /** Fewest and most cells (of 9) that show the requested shape. */
  targetMin: number;
  targetMax: number;
  /**
   * "basic": circle, square, triangle, star. "similar": circle, oval, square, rounded square.
   * "photos": one illustrated object per tile. "scenes": a scene with a main object and small background objects.
   */
  family: string;
  /** Picture variants only. "none": distractors from other groups. "some": a third from the target's group. "group": mostly the target's group. */
  lookalike: string;
}

export const IMAGE_GRID_VARIANTS: CaptchaVariantSet<ImageGridVariantConfig> = {
  variants: [
    {
      id: "basic-shapes",
      name: "Basic shapes",
      description: "Four clearly different shapes; difficulty raises how many cells match.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "basic", lookalike: "none" },
        medium: { targetMin: 2, targetMax: 4, family: "basic", lookalike: "none" },
        hard: { targetMin: 3, targetMax: 5, family: "basic", lookalike: "none" },
      },
    },
    {
      id: "similar-shapes",
      name: "Similar shapes",
      description: "Pairs that look alike (circle and oval, square and rounded square) act as distractors.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "similar", lookalike: "none" },
        medium: { targetMin: 2, targetMax: 4, family: "similar", lookalike: "none" },
        hard: { targetMin: 3, targetMax: 5, family: "similar", lookalike: "none" },
      },
    },
    {
      id: "photo-categories",
      name: "Picture categories",
      description: "Pick every picture of the named object (a bicycle, a bus, a tree...); harder levels add look-alike objects.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "photos", lookalike: "none" },
        medium: { targetMin: 2, targetMax: 4, family: "photos", lookalike: "some" },
        hard: { targetMin: 3, targetMax: 5, family: "photos", lookalike: "group" },
      },
    },
    {
      id: "scene-objects",
      name: "Scene objects",
      description: "Each tile is a small scene; pick every scene whose main object is the named one.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "scenes", lookalike: "none" },
        medium: { targetMin: 2, targetMax: 4, family: "scenes", lookalike: "some" },
        hard: { targetMin: 3, targetMax: 5, family: "scenes", lookalike: "group" },
      },
    },
  ],
  defaultSelection: { variantId: "basic-shapes", difficulty: "medium" },
};
