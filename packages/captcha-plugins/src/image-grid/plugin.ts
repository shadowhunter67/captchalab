import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractImageGridFeatures } from "./feature-extractor";
import { generateImageGridChallenge } from "./generator";
import { IMAGE_GRID_ID, type ImageGridAnswer, type ImageGridChallenge, type ImageGridFeatures } from "./types";
import { verifyImageGridAnswer } from "./verifier";

export const imageGridPlugin = defineCaptchaPlugin<typeof IMAGE_GRID_ID, ImageGridChallenge, ImageGridAnswer, ImageGridFeatures>({
  id: IMAGE_GRID_ID,
  name: "Image Grid",
  version: "1.0.0",
  generate: generateImageGridChallenge,
  verify: (challenge, answer) => verifyImageGridAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractImageGridFeatures(challenge, interaction),
});

export type ImageGridPlugin = typeof imageGridPlugin;
