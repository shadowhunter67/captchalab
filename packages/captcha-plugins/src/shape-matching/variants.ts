import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface ShapeMatchingVariantConfig {
  [key: string]: number | string | boolean;
  /** Number of source/target pairs. */
  pairs: number;
  /** "low": four clearly different shapes. "medium": adds an oval. "high": circle/oval and square/rounded square pairs. */
  similarity: string;
  /** Targets are turned by a random multiple of 15 degrees up to this much (0 = never). */
  rotationDeg: number;
  /** Targets may be drawn as outlines while sources are filled. */
  mixedFill: boolean;
  /** Targets are scaled by 1 +/- this much (0 = never). */
  sizeVariation: number;
}

/**
 * Pairs stay at 5 or fewer so the board still fits a phone. Look-alike distractors come from the shape pool, never
 * from making shapes unreadable.
 */
export const SHAPE_MATCHING_VARIANTS: CaptchaVariantSet<ShapeMatchingVariantConfig> = {
  variants: [
    {
      id: "exact",
      name: "Exact shape",
      description: "Each source has an identical twin among the targets; difficulty adds pairs and look-alikes.",
      difficulties: {
        easy: { pairs: 3, similarity: "low", rotationDeg: 0, mixedFill: false, sizeVariation: 0 },
        medium: { pairs: 4, similarity: "medium", rotationDeg: 0, mixedFill: false, sizeVariation: 0 },
        hard: { pairs: 5, similarity: "high", rotationDeg: 0, mixedFill: false, sizeVariation: 0 },
      },
    },
    {
      id: "pattern",
      name: "Pattern match",
      description: "Targets show the same shape turned, outlined or resized: match by structure, not by looks.",
      difficulties: {
        easy: { pairs: 3, similarity: "low", rotationDeg: 90, mixedFill: false, sizeVariation: 0.2 },
        medium: { pairs: 4, similarity: "medium", rotationDeg: 180, mixedFill: true, sizeVariation: 0.3 },
        hard: { pairs: 5, similarity: "high", rotationDeg: 330, mixedFill: true, sizeVariation: 0.4 },
      },
    },
  ],
  defaultSelection: { variantId: "exact", difficulty: "medium" },
};
