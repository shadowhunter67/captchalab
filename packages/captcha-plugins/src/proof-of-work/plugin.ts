import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractPowFeatures } from "./feature-extractor";
import { generatePowChallenge } from "./generator";
import { POW_ID, type PowAnswer, type PowChallenge, type PowFeatureContext, type PowFeatures } from "./types";
import { verifyPowAnswer } from "./verifier";

export const proofOfWorkPlugin = defineCaptchaPlugin<typeof POW_ID, PowChallenge, PowAnswer, PowFeatures, PowFeatureContext>({
  id: POW_ID,
  name: "Proof of Work",
  version: "1.0.0",
  generate: generatePowChallenge,
  verify: (challenge, answer) => verifyPowAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractPowFeatures(challenge, interaction, context),
});

export type ProofOfWorkPlugin = typeof proofOfWorkPlugin;
