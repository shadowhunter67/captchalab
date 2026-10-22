import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractDragDropFeatures } from "./feature-extractor";
import { generateDragDropChallenge } from "./generator";
import {
  DRAG_DROP_ID,
  type DragDropAnswer,
  type DragDropChallenge,
  type DragDropFeatureContext,
  type DragDropFeatures,
} from "./types";
import { verifyDragDropAnswer } from "./verifier";

export const dragDropPlugin = defineCaptchaPlugin<
  typeof DRAG_DROP_ID,
  DragDropChallenge,
  DragDropAnswer,
  DragDropFeatures,
  DragDropFeatureContext
>({
  id: DRAG_DROP_ID,
  name: "Drag & Drop",
  version: "1.0.0",
  generate: generateDragDropChallenge,
  verify: (challenge, answer) => verifyDragDropAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractDragDropFeatures(challenge, interaction, context),
});

export type DragDropPlugin = typeof dragDropPlugin;
