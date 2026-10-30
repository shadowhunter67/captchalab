import { defineCaptchaPlugin } from "@captchalab/captcha-core";
import { extractMatchKeyFeatures } from "./feature-extractor";
import { generateMatchKeyChallenge } from "./generator";
import { MATCH_KEY_ID, type MatchKeyAnswer, type MatchKeyChallenge, type MatchKeyFeatures } from "./types";
import { verifyMatchKeyAnswer } from "./verifier";

export const matchKeyPlugin = defineCaptchaPlugin<typeof MATCH_KEY_ID, MatchKeyChallenge, MatchKeyAnswer, MatchKeyFeatures>({
  id: MATCH_KEY_ID,
  name: "MatchKey",
  version: "1.0.0",
  generate: generateMatchKeyChallenge,
  verify: (challenge, answer) => verifyMatchKeyAnswer(challenge, answer),
  extractFeatures: (challenge, interaction) => extractMatchKeyFeatures(challenge, interaction),
});
