import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractShapeMatchingFeatures } from "./feature-extractor";
import { generateShapeMatchingChallenge } from "./generator";
import { SHAPE_MATCHING_ID, type ShapeMatchingAnswer, type ShapeMatchingChallenge, type ShapeMatchingFeatures } from "./types";
import { verifyShapeMatchingAnswer } from "./verifier";

export const shapeMatchingPlugin = defineCaptchaPlugin<typeof SHAPE_MATCHING_ID, ShapeMatchingChallenge, ShapeMatchingAnswer, ShapeMatchingFeatures>({
  id: SHAPE_MATCHING_ID,
  name: "Shape Matching",
  version: "1.0.0",
  generate: generateShapeMatchingChallenge,
  verify: (challenge, answer) => verifyShapeMatchingAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractShapeMatchingFeatures(challenge, interaction),
});

export type ShapeMatchingPlugin = typeof shapeMatchingPlugin;
