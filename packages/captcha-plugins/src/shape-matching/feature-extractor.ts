import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { EMPTY_MATCH_STATE, applyActivation, type MatchState } from "./matching";
import {
  SHAPE_MATCHING_EXTRACTOR,
  SHAPE_MATCHING_FEATURES_SCHEMA,
  parseMatchTarget,
  type Activation,
  type ShapeMatchingChallenge,
  type ShapeMatchingFeatures,
} from "./types";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

export interface TimedActivation extends Activation {
  t: number;
  index: number;
}

/** Completed presses and Space/Enter keydowns on the cells, in event order. */
export function extractMatchActivations(session: InteractionSession): TimedActivation[] {
  const out: TimedActivation[] = [];
  for (const g of extractGestures(session)) {
    const first = parseMatchTarget(g.target);
    const last = g.events[g.events.length - 1];
    const end = last ? parseMatchTarget(last.target) : null;
    if (first && end && g.endedBy === "up" && end.kind === first.kind && end.id === first.id) out.push({ ...first, t: g.endT, index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.type !== "keydown" || !ACTIVATION_KEYS.has(e.code)) return;
    const act = parseMatchTarget(e.target);
    if (act) out.push({ ...act, t: e.t, index });
  });
  return out.sort((a, b) => a.t - b.t || a.index - b.index);
}

/** See the definitions in ./types.ts. */
export function extractShapeMatchingFeatures(challenge: ShapeMatchingChallenge, session: InteractionSession): FeatureSet<ShapeMatchingFeatures> {
  const acts = extractMatchActivations(session);
  const firstPress = session.events.find(
    (e) => parseMatchTarget(e.target) !== null && ((!isKeyEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );
  let state: MatchState = EMPTY_MATCH_STATE;
  let selections = 0;
  let attempts = 0;
  let correct = 0;
  let corrections = 0;
  let firstMatch: number | null = null;
  for (const a of acts) {
    const step = applyActivation(state, a, challenge);
    state = step.state;
    if (step.effect === "select") selections++;
    else if (step.effect === "match") {
      attempts++;
      if (step.correct) correct++;
      if (step.replaced) corrections++;
      firstMatch ??= a.t;
    } else if (step.effect === "unmatch") corrections++;
  }
  let gaps = 0;
  for (let i = 1; i < acts.length; i++) gaps += (acts[i] as { t: number }).t - (acts[i - 1] as { t: number }).t;
  return createFeatureSet(composeVersion(SHAPE_MATCHING_FEATURES_SCHEMA), composeVersion(SHAPE_MATCHING_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstPress?.t ?? null,
    timeToFirstMatch: firstMatch,
    selectionCount: selections,
    matchAttempts: attempts,
    correctMatchCount: correct,
    incorrectMatchCount: attempts - correct,
    correctionCount: corrections,
    interActionTimeMean: acts.length >= 2 ? gaps / (acts.length - 1) : null,
    inputModality: session.inputModality,
  });
}
