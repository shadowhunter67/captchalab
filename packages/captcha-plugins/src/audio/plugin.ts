import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractAudioFeatures } from "./feature-extractor";
import { generateAudioChallenge } from "./generator";
import { AUDIO_ID, type AudioAnswer, type AudioChallenge, type AudioFeatures } from "./types";
import { verifyAudioAnswer } from "./verifier";

export const audioPlugin = defineCaptchaPlugin<typeof AUDIO_ID, AudioChallenge, AudioAnswer, AudioFeatures>({
  id: AUDIO_ID,
  name: "Audio",
  version: "1.0.0",
  generate: generateAudioChallenge,
  verify: (challenge, answer) => verifyAudioAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractAudioFeatures(challenge, interaction),
});

export type AudioPlugin = typeof audioPlugin;
