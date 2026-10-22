import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractTextFeatures } from "./feature-extractor";
import { generateTextChallenge } from "./generator";
import { TEXT_ID, type TextAnswer, type TextChallenge, type TextFeatures } from "./types";
import { verifyTextAnswer } from "./verifier";

export const textPlugin = defineCaptchaPlugin<typeof TEXT_ID, TextChallenge, TextAnswer, TextFeatures>({
  id: TEXT_ID,
  name: "Text",
  version: "1.0.0",
  generate: generateTextChallenge,
  verify: (challenge, answer) => verifyTextAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractTextFeatures(challenge, interaction),
});

export type TextPlugin = typeof textPlugin;
