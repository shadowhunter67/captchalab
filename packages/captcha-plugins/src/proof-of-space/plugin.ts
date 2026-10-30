import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractPosFeatures } from "./feature-extractor";
import { generatePosChallenge } from "./generator";
import { POS_ID, type PosAnswer, type PosChallenge, type PosFeatureContext, type PosFeatures } from "./types";
import { verifyPosAnswer } from "./verifier";

export const proofOfSpacePlugin = defineCaptchaPlugin<typeof POS_ID, PosChallenge, PosAnswer, PosFeatures, PosFeatureContext>({
  id: POS_ID,
  name: "Proof of Space",
  version: "1.0.0",
  generate: generatePosChallenge,
  verify: (challenge, answer) => verifyPosAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractPosFeatures(challenge, interaction, context),
});
