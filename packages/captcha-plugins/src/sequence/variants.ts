import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface SequenceVariantConfig {
  [key: string]: number | string;
  /** Terms or symbols shown, counting the hidden one. */
  length: number;
  /** Number: which pattern families a challenge of this level draws from. Visual: the length of the repeating unit. */
  patterns: string;
  /** Visual: how many answer options are offered. 0 for number sequences. */
  options: number;
}

/**
 * Every challenge has exactly one answer under the pattern families listed for its level (see rules.ts); the
 * generator rejects a draw where a simpler family would predict something else.
 */
export const SEQUENCE_VARIANTS: CaptchaVariantSet<SequenceVariantConfig> = {
  variants: [
    {
      id: "number",
      name: "Number",
      description: "Find the missing number: a steady step, then multiplication or alternating steps, then two rules at once.",
      difficulties: {
        easy: { length: 5, patterns: "arithmetic", options: 0 },
        medium: { length: 5, patterns: "geometric, alternating", options: 0 },
        hard: { length: 6, patterns: "interleaved", options: 0 },
      },
    },
    {
      id: "visual",
      name: "Visual",
      description: "Find the missing shape in a repeating pattern; longer units are harder.",
      difficulties: {
        easy: { length: 5, patterns: "2", options: 3 },
        medium: { length: 6, patterns: "3", options: 4 },
        hard: { length: 8, patterns: "4", options: 4 },
      },
    },
  ],
  defaultSelection: { variantId: "number", difficulty: "medium" },
};
