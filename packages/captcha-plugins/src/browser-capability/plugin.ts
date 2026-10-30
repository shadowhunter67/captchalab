import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractBcFeatures } from "./feature-extractor";
import { generateBcChallenge } from "./generator";
import { BC_ID, type BcAnswer, type BcChallenge, type BcFeatureContext, type BcFeatures } from "./types";
import { verifyBcAnswer } from "./verifier";

export const browserCapabilityPlugin = defineCaptchaPlugin<typeof BC_ID, BcChallenge, BcAnswer, BcFeatures, BcFeatureContext>({
  id: BC_ID,
  name: "Browser Capability",
  version: "1.0.0",
  generate: generateBcChallenge,
  verify: (challenge, answer) => verifyBcAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractBcFeatures(challenge, interaction, context),
});
