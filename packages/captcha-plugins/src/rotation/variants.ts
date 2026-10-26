import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface RotationVariantConfig {
  [key: string]: number | boolean;
  /** Accepted shortest angular distance to upright, degrees. Keyboard steps are 5 degrees, so keep it >= 5. */
  toleranceDeg: number;
  /** Smallest and largest starting displacement from upright, degrees. */
  minInitialDeg: number;
  maxInitialDeg: number;
  /** true: the start is that far to a random side (clockwise or counter-clockwise); false: uniform over the range. */
  randomSide: boolean;
}

export const ROTATION_VARIANTS: CaptchaVariantSet<RotationVariantConfig> = {
  variants: [
    {
      id: "classic",
      name: "Classic",
      description: "Any starting angle; difficulty narrows the accepted angle.",
      difficulties: {
        easy: { toleranceDeg: 20, minInitialDeg: 40, maxInitialDeg: 320, randomSide: false },
        medium: { toleranceDeg: 12, minInitialDeg: 40, maxInitialDeg: 320, randomSide: false },
        hard: { toleranceDeg: 6, minInitialDeg: 40, maxInitialDeg: 320, randomSide: false },
      },
    },
    {
      id: "offset-start",
      name: "Offset start",
      description: "The same tolerance, but the object starts further from upright as difficulty rises.",
      difficulties: {
        easy: { toleranceDeg: 12, minInitialDeg: 40, maxInitialDeg: 90, randomSide: true },
        medium: { toleranceDeg: 12, minInitialDeg: 90, maxInitialDeg: 140, randomSide: true },
        hard: { toleranceDeg: 12, minInitialDeg: 140, maxInitialDeg: 180, randomSide: true },
      },
    },
  ],
  defaultSelection: { variantId: "classic", difficulty: "medium" },
};
