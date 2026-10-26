import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractMathLogicFeatures } from "./feature-extractor";
import { generateMathChallenge } from "./generator";
import { MATH_LOGIC_ID, type MathAnswer, type MathChallenge, type MathLogicFeatures } from "./types";
import { verifyMathAnswer } from "./verifier";

export const mathLogicPlugin = defineCaptchaPlugin<typeof MATH_LOGIC_ID, MathChallenge, MathAnswer, MathLogicFeatures>({
  id: MATH_LOGIC_ID,
  name: "Math / Logic",
  version: "1.0.0",
  generate: generateMathChallenge,
  verify: (challenge, answer) => verifyMathAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractMathLogicFeatures(challenge, interaction),
});

export type MathLogicPlugin = typeof mathLogicPlugin;
