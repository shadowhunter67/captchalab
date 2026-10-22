import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractCheckboxFeatures } from "./feature-extractor";
import { generateCheckboxChallenge } from "./generator";
import { CHECKBOX_ID, type CheckboxAnswer, type CheckboxChallenge, type CheckboxFeatures } from "./types";
import { verifyCheckboxAnswer } from "./verifier";

export const checkboxPlugin = defineCaptchaPlugin<
  typeof CHECKBOX_ID,
  CheckboxChallenge,
  CheckboxAnswer,
  CheckboxFeatures
>({
  id: CHECKBOX_ID,
  name: "Checkbox",
  version: "1.0.0",
  generate: generateCheckboxChallenge,
  verify: (challenge, answer) => verifyCheckboxAnswer(challenge, answer),
  // No UI geometry is needed: features come from events alone (feature context is `undefined`).
  extractFeatures: (_challenge, interaction) => extractCheckboxFeatures(interaction),
});

export type CheckboxPlugin = typeof checkboxPlugin;
