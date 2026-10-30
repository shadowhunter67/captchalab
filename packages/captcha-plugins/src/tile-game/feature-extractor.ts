import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { extractCellActivations, firstCellPress } from "../shared/activations";
import { applyTileActivation, sameSet } from "./selection";
import { TILE_GAME_EXTRACTOR, TILE_GAME_FEATURES_SCHEMA, parseTileTarget, type TileGameChallenge, type TileGameFeatures } from "./types";

/** See the definitions in ./types.ts. */
export function extractTileGameFeatures(challenge: TileGameChallenge, session: InteractionSession): FeatureSet<TileGameFeatures> {
  const acts = extractCellActivations(session, parseTileTarget);
  let selected: readonly string[] = [];
  let selections = 0;
  let correct = 0;
  let wrong = 0;
  let corrections = 0;
  let first: number | null = null;
  for (const a of acts) {
    const step = applyTileActivation(selected, a.id, challenge.required);
    selected = step.selected;
    if (step.effect === "deselect") corrections++;
    else if (step.effect === "select") {
      selections++;
      first ??= a.t;
      if (selected.length === challenge.required) {
        if (sameSet(selected, challenge.answerIds)) correct++;
        else wrong++;
      }
    }
  }
  return createFeatureSet(composeVersion(TILE_GAME_FEATURES_SCHEMA), composeVersion(TILE_GAME_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstCellPress(session, parseTileTarget),
    firstSelectionTime: first,
    selectionCount: selections,
    correctPairCount: correct,
    wrongPairCount: wrong,
    correctionCount: corrections,
    inputModality: session.inputModality,
  });
}
