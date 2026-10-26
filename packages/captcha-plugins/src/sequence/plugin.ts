import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractSequenceFeatures } from "./feature-extractor";
import { generateSequenceChallenge } from "./generator";
import { SEQUENCE_ID, type SequenceAnswer, type SequenceChallenge, type SequenceFeatures } from "./types";
import { verifySequenceAnswer } from "./verifier";

export const sequencePlugin = defineCaptchaPlugin<typeof SEQUENCE_ID, SequenceChallenge, SequenceAnswer, SequenceFeatures>({
  id: SEQUENCE_ID,
  name: "Sequence",
  version: "1.0.0",
  generate: generateSequenceChallenge,
  verify: (challenge, answer) => verifySequenceAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractSequenceFeatures(challenge, interaction),
});

export type SequencePlugin = typeof sequencePlugin;
