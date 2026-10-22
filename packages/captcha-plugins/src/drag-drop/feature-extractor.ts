import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  MOTION_EXTRACTOR,
  MOTION_FEATURES_SCHEMA,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { deriveDragAttempts } from "./attempts";
import { allCorrect } from "./placement";
import {
  DRAG_DROP_EXTRACTOR,
  DRAG_DROP_FEATURES_SCHEMA,
  type DragDropChallenge,
  type DragDropFeatureContext,
  type DragDropFeatures,
} from "./types";

const sum = (values: readonly number[]): number => values.reduce((s, v) => s + v, 0);

/** See the definitions in ./types.ts. Throws RangeError for an invalid layout. */
export function extractDragDropFeatures(
  challenge: DragDropChallenge,
  session: InteractionSession,
  { layout }: DragDropFeatureContext,
): FeatureSet<DragDropFeatures> {
  const { attempts, finalState } = deriveDragAttempts(challenge, layout, session);
  const released = attempts.filter((a) => a.outcome !== "cancelled");
  const n = released.length;
  const errors = released.flatMap((a) => (a.releaseError === null ? [] : [a.releaseError]));

  // Earliest attempt such that every state from it to the end is all-correct (and the final one is).
  let timeToAllCorrect: number | null = null;
  if (allCorrect(challenge, finalState)) {
    let k = attempts.length - 1;
    while (k > 0 && allCorrect(challenge, (attempts[k - 1] as { stateAfter: typeof finalState }).stateAfter)) k--;
    timeToAllCorrect = attempts[k]?.endT ?? null;
  }

  const totalDuration = sum(released.map((a) => a.endT - a.startT));
  const totalDistance = sum(released.map((a) => a.distance));

  return createFeatureSet(
    composeVersion(DRAG_DROP_FEATURES_SCHEMA, MOTION_FEATURES_SCHEMA),
    composeVersion(DRAG_DROP_EXTRACTOR, MOTION_EXTRACTOR),
    {
      ...extractBaseFeatures(session),
      reactionTime: attempts[0]?.startT ?? null,
      timeToAllCorrect,
      numberOfDragAttempts: attempts.length,
      successfulDropCount: released.filter((a) => a.outcome === "correct").length,
      failedDropCount: released.filter((a) => a.outcome === "wrong-target" || a.outcome === "miss").length,
      cancelledDragCount: attempts.length - n,
      totalDragDuration: n > 0 ? totalDuration : null,
      meanDragDuration: n > 0 ? totalDuration / n : null,
      totalDragDistance: n > 0 ? totalDistance : null,
      meanDragDistance: n > 0 ? totalDistance / n : null,
      meanReleaseError: errors.length > 0 ? sum(errors) / errors.length : null,
      maxReleaseError: errors.length > 0 ? Math.max(...errors) : null,
      directionChanges: sum(released.map((a) => a.directionChanges)),
      inputModality: session.inputModality,
    },
  );
}
