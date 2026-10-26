import { type CaptchaVariantSet } from "@captchalab/captcha-core";

/** Normalized tolerance (fraction of the handle's travel). Keyboard steps are 0.01, so keep it >= 0.01. */
export interface SliderVariantConfig {
  [key: string]: number;
  tolerance: number;
}

export const SLIDER_VARIANTS: CaptchaVariantSet<SliderVariantConfig> = {
  variants: [
    {
      id: "classic",
      name: "Classic",
      description: "The usual slider; difficulty narrows the accepted release window.",
      difficulties: { easy: { tolerance: 0.04 }, medium: { tolerance: 0.02 }, hard: { tolerance: 0.012 } },
    },
    {
      id: "precision",
      name: "Precision",
      description: "A narrow target from the start; difficulty makes it narrower still.",
      difficulties: { easy: { tolerance: 0.015 }, medium: { tolerance: 0.012 }, hard: { tolerance: 0.01 } },
    },
  ],
  defaultSelection: { variantId: "classic", difficulty: "medium" },
};
