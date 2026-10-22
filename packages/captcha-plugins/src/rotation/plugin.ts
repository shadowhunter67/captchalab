import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractRotationFeatures } from "./feature-extractor";
import { generateRotationChallenge } from "./generator";
import {
  ROTATION_ID,
  type RotationAnswer,
  type RotationChallenge,
  type RotationFeatureContext,
  type RotationFeatures,
} from "./types";
import { verifyRotationAnswer } from "./verifier";

export const rotationPlugin = defineCaptchaPlugin<
  typeof ROTATION_ID,
  RotationChallenge,
  RotationAnswer,
  RotationFeatures,
  RotationFeatureContext
>({
  id: ROTATION_ID,
  name: "Image Rotation",
  version: "1.0.0",
  generate: generateRotationChallenge,
  verify: (challenge, answer) => verifyRotationAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractRotationFeatures(challenge, interaction, context),
});

export type RotationPlugin = typeof rotationPlugin;
