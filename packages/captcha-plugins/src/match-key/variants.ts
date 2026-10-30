import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface MatchKeyVariantConfig {
  [key: string]: number | string | boolean;
  /** Number of options, one of them correct. */
  options: number;
  /** Every wrong option differs from the key on at least / at most this many KEY attributes. */
  minDiff: number;
  maxDiff: number;
  /** How many attributes the answer must share with the key (3 = exact, 2 = a chosen pair). */
  keyAttributes: number;
}

/** 4 / 5 / 6 options. Hard means every wrong option differs from the key in a single key attribute. */
export const MATCH_KEY_VARIANTS: CaptchaVariantSet<MatchKeyVariantConfig> = {
  variants: [
    {
      id: "exact",
      name: "Exact Match",
      description: "Pick the option that is identical to the key in shape, pattern and orientation (size may differ).",
      difficulties: {
        easy: { options: 4, minDiff: 2, maxDiff: 3, keyAttributes: 3 },
        medium: { options: 5, minDiff: 1, maxDiff: 2, keyAttributes: 3 },
        hard: { options: 6, minDiff: 1, maxDiff: 1, keyAttributes: 3 },
      },
    },
    {
      id: "attribute",
      name: "Attribute Match",
      description: "Pick the option that shares the two attributes the task names; the third attribute and the size are free to differ.",
      difficulties: {
        easy: { options: 4, minDiff: 2, maxDiff: 2, keyAttributes: 2 },
        medium: { options: 5, minDiff: 1, maxDiff: 2, keyAttributes: 2 },
        hard: { options: 6, minDiff: 1, maxDiff: 1, keyAttributes: 2 },
      },
    },
  ],
  defaultSelection: { variantId: "exact", difficulty: "medium" },
};
