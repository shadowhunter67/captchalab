import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { MATH_LOGIC_EXTRACTOR, MATH_LOGIC_FEATURES_SCHEMA, MATH_TARGET, type MathChallenge, type MathLogicFeatures } from "./types";
import { typingStats } from "./typing";

/** See the definitions in ./types.ts. Uses only key codes and times; the challenge is not needed. */
export function extractMathLogicFeatures(_challenge: MathChallenge, session: InteractionSession): FeatureSet<MathLogicFeatures> {
  return createFeatureSet(composeVersion(MATH_LOGIC_FEATURES_SCHEMA), composeVersion(MATH_LOGIC_EXTRACTOR), {
    ...extractBaseFeatures(session),
    ...typingStats(session, MATH_TARGET),
    inputModality: session.inputModality,
  });
}
