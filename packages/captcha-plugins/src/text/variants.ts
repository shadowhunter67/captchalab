import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface TextVariantConfig {
  [key: string]: number;
  /** Number of characters. */
  length: number;
  /** Each character is turned by up to this many degrees either way. */
  rotationDeg: number;
  /** Each character is shifted vertically by up to this fraction of the image height either way. */
  shift: number;
  /** Number of random lines drawn over the text. */
  noiseLines: number;
}

/**
 * Parameters stay modest on purpose: "hard" is harder to read for people too, but never unreadable, and this
 * is an educational lab, not an attempt at a text CAPTCHA that software cannot read.
 */
export const TEXT_VARIANTS: CaptchaVariantSet<TextVariantConfig> = {
  variants: [
    {
      id: "clean",
      name: "Clean",
      description: "Minimal distortion: characters barely move and there is little noise.",
      difficulties: {
        easy: { length: 5, rotationDeg: 4, shift: 0.02, noiseLines: 0 },
        medium: { length: 6, rotationDeg: 8, shift: 0.04, noiseLines: 1 },
        hard: { length: 6, rotationDeg: 12, shift: 0.06, noiseLines: 2 },
      },
    },
    {
      id: "rotated",
      name: "Rotated",
      description: "Each character is turned and shifted on its own.",
      difficulties: {
        easy: { length: 5, rotationDeg: 10, shift: 0.06, noiseLines: 2 },
        medium: { length: 6, rotationDeg: 18, shift: 0.12, noiseLines: 4 },
        hard: { length: 6, rotationDeg: 26, shift: 0.12, noiseLines: 6 },
      },
    },
    {
      id: "noisy",
      name: "Noisy",
      description: "Mild rotation with many random lines crossing the text.",
      difficulties: {
        easy: { length: 5, rotationDeg: 8, shift: 0.05, noiseLines: 8 },
        medium: { length: 6, rotationDeg: 12, shift: 0.08, noiseLines: 12 },
        hard: { length: 6, rotationDeg: 16, shift: 0.1, noiseLines: 18 },
      },
    },
  ],
  defaultSelection: { variantId: "rotated", difficulty: "medium" },
};
