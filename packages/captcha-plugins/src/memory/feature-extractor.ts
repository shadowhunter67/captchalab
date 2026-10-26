import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { EMPTY_RECALL, applyRecall, type RecallState } from "./recall";
import {
  MEMORY_EXTRACTOR,
  MEMORY_FEATURES_SCHEMA,
  parseMemoryTarget,
  type MemoryActivation,
  type MemoryChallenge,
  type MemoryFeatureContext,
  type MemoryFeatures,
} from "./types";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

export interface TimedMemoryActivation {
  act: MemoryActivation;
  t: number;
  index: number;
}

/** Completed presses and Space/Enter keydowns on the memory controls, in event order. */
export function extractMemoryActivations(session: InteractionSession): TimedMemoryActivation[] {
  const out: TimedMemoryActivation[] = [];
  for (const g of extractGestures(session)) {
    const first = parseMemoryTarget(g.target);
    const last = g.events[g.events.length - 1];
    const end = last ? parseMemoryTarget(last.target) : null;
    if (first && end && g.endedBy === "up" && last?.target === g.target) out.push({ act: first, t: g.endT, index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.type !== "keydown" || !ACTIVATION_KEYS.has(e.code)) return;
    const act = parseMemoryTarget(e.target);
    if (act) out.push({ act, t: e.t, index });
  });
  return out.sort((a, b) => a.t - b.t || a.index - b.index);
}

/** See the definitions in ./types.ts. */
export function extractMemoryFeatures(
  challenge: MemoryChallenge,
  session: InteractionSession,
  context: MemoryFeatureContext,
): FeatureSet<MemoryFeatures> {
  const recallStart = context.recallStartMs;
  const acts = extractMemoryActivations(session).filter((a) => recallStart === null || a.act.kind === "start" || a.t >= recallStart);
  const firstPress = session.events.find(
    (e) => parseMemoryTarget(e.target) !== null && ((!isKeyEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );

  let state: RecallState = EMPTY_RECALL;
  let selections = 0;
  let correct = 0;
  let corrections = 0;
  let firstSelection: number | null = null;
  let lastAction: number | null = null;
  for (const a of acts) {
    if (a.act.kind === "start" || recallStart === null) continue; // nothing counts before recall begins
    const step = applyRecall(state, a.act, challenge);
    state = step.state;
    if (step.effect === "none") continue;
    lastAction = a.t;
    if (step.effect === "select") {
      selections++;
      if (step.correct) correct++;
      firstSelection ??= a.t;
    } else corrections++;
  }
  return createFeatureSet(composeVersion(MEMORY_FEATURES_SCHEMA), composeVersion(MEMORY_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstPress?.t ?? null,
    recallDuration: recallStart !== null && lastAction !== null ? lastAction - recallStart : null,
    timeToFirstSelection: recallStart !== null && firstSelection !== null ? firstSelection - recallStart : null,
    selectionCount: selections,
    correctSelections: correct,
    incorrectSelections: selections - correct,
    correctionCount: corrections,
    inputModality: session.inputModality,
  });
}
