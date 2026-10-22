import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractSliderFeatures } from "./feature-extractor";
import { generateSliderChallenge } from "./generator";
import {
  SLIDER_ID,
  type SliderAnswer,
  type SliderChallenge,
  type SliderFeatureContext,
  type SliderFeatures,
} from "./types";
import { verifySliderAnswer } from "./verifier";

export const sliderPlugin = defineCaptchaPlugin<
  typeof SLIDER_ID,
  SliderChallenge,
  SliderAnswer,
  SliderFeatures,
  SliderFeatureContext
>({
  id: SLIDER_ID,
  name: "Slider",
  version: "1.0.0",
  generate: generateSliderChallenge,
  verify: (challenge, answer) => verifySliderAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) =>
    extractSliderFeatures(challenge, interaction, context),
});

export type SliderPlugin = typeof sliderPlugin;
