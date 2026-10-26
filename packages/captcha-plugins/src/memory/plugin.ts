import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractMemoryFeatures } from "./feature-extractor";
import { generateMemoryChallenge } from "./generator";
import { MEMORY_ID, type MemoryAnswer, type MemoryChallenge, type MemoryFeatureContext, type MemoryFeatures } from "./types";
import { verifyMemoryAnswer } from "./verifier";

export const memoryPlugin = defineCaptchaPlugin<typeof MEMORY_ID, MemoryChallenge, MemoryAnswer, MemoryFeatures, MemoryFeatureContext>({
  id: MEMORY_ID,
  name: "Memory",
  version: "1.0.0",
  generate: generateMemoryChallenge,
  verify: (challenge, answer) => verifyMemoryAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractMemoryFeatures(challenge, interaction, context),
});

export type MemoryPlugin = typeof memoryPlugin;
