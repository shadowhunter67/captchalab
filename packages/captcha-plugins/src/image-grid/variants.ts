import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface ImageGridVariantConfig {
  [key: string]: number | string;
  /** Fewest and most cells (of 9) that show the requested shape. */
  targetMin: number;
  targetMax: number;
  /** "basic": circle, square, triangle, star. "similar": circle, oval, square, rounded square. */
  family: string;
}

export const IMAGE_GRID_VARIANTS: CaptchaVariantSet<ImageGridVariantConfig> = {
  variants: [
    {
      id: "basic-shapes",
      name: "Basic shapes",
      description: "Four clearly different shapes; difficulty raises how many cells match.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "basic" },
        medium: { targetMin: 2, targetMax: 4, family: "basic" },
        hard: { targetMin: 3, targetMax: 5, family: "basic" },
      },
    },
    {
      id: "similar-shapes",
      name: "Similar shapes",
      description: "Pairs that look alike (circle and oval, square and rounded square) act as distractors.",
      difficulties: {
        easy: { targetMin: 2, targetMax: 3, family: "similar" },
        medium: { targetMin: 2, targetMax: 4, family: "similar" },
        hard: { targetMin: 3, targetMax: 5, family: "similar" },
      },
    },
  ],
  defaultSelection: { variantId: "basic-shapes", difficulty: "medium" },
};
