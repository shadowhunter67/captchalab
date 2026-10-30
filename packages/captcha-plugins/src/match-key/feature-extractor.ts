import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { extractCellActivations, firstCellPress } from "../shared/activations";
import { applyOptionActivation } from "./selection";
import { MATCH_KEY_EXTRACTOR, MATCH_KEY_FEATURES_SCHEMA, parseMatchOptionTarget, type MatchKeyChallenge, type MatchKeyFeatures } from "./types";

/** See the definitions in ./types.ts. */
export function extractMatchKeyFeatures(challenge: MatchKeyChallenge, session: InteractionSession): FeatureSet<MatchKeyFeatures> {
  const acts = extractCellActivations(session, parseMatchOptionTarget);
  let selected: string | null = null;
  let selections = 0;
  let wrong = 0;
  let corrections = 0;
  for (const a of acts) {
    const step = applyOptionActivation(selected, a.id);
    selected = step.selected;
    if (step.effect === "clear") corrections++;
    else {
      selections++;
      if (step.effect === "replace") corrections++;
      if (a.id !== challenge.correctId) wrong++;
    }
  }
  return createFeatureSet(composeVersion(MATCH_KEY_FEATURES_SCHEMA), composeVersion(MATCH_KEY_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstCellPress(session, parseMatchOptionTarget),
    timeToFirstSelection: acts[0]?.t ?? null,
    selectionCount: selections,
    wrongSelectionCount: wrong,
    correctionCount: corrections,
    inputModality: session.inputModality,
  });
}
