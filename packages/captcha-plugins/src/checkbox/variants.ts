import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface CheckboxVariantConfig {
  [key: string]: string;
  activation: string;
}

/**
 * Ticking a box has nothing that can honestly be made "harder" (a delay or a confirmation sequence would only
 * annoy people), so this variant supports a single level.
 */
export const CHECKBOX_VARIANTS: CaptchaVariantSet<CheckboxVariantConfig> = {
  variants: [
    {
      id: "basic",
      name: "Basic",
      description: "A single native checkbox. One level only: difficulty does not apply to a checkbox.",
      difficulties: { medium: { activation: "single press" } },
    },
  ],
  defaultSelection: { variantId: "basic", difficulty: "medium" },
};
