import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { TYPING_PAUSE_MS, typingStats } from "../math-logic/typing";
import { SEQUENCE_EXTRACTOR, SEQUENCE_FEATURES_SCHEMA, SEQUENCE_TARGET, parseOptionTarget, type SequenceChallenge, type SequenceFeatures } from "./types";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

interface Activation {
  id: string;
  t: number;
  index: number;
}

/** Completed presses and Space/Enter keydowns on the answer options, in event order. */
export function extractOptionActivations(session: InteractionSession): Activation[] {
  const out: Activation[] = [];
  for (const g of extractGestures(session)) {
    const first = parseOptionTarget(g.target);
    const last = g.events[g.events.length - 1];
    if (first !== null && g.endedBy === "up" && last && parseOptionTarget(last.target) === first) out.push({ id: first, t: g.endT, index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.type !== "keydown" || !ACTIVATION_KEYS.has(e.code)) return;
    const id = parseOptionTarget(e.target);
    if (id !== null) out.push({ id, t: e.t, index });
  });
  return out.sort((a, b) => a.t - b.t || a.index - b.index);
}

/** See the definitions in ./types.ts. */
export function extractSequenceFeatures(challenge: SequenceChallenge, session: InteractionSession): FeatureSet<SequenceFeatures> {
  const base = extractBaseFeatures(session);
  const version = [composeVersion(SEQUENCE_FEATURES_SCHEMA), composeVersion(SEQUENCE_EXTRACTOR)] as const;

  if (challenge.kind === "number") {
    const s = typingStats(session, SEQUENCE_TARGET);
    return createFeatureSet(...version, {
      ...base,
      reactionTime: s.reactionTime,
      timeToFirstKey: s.timeToFirstKey,
      keyCount: s.keyCount,
      backspaceCount: s.backspaceCount,
      timeToFirstSelection: null,
      selectionCount: null,
      correctionCount: s.correctionCount,
      interActionTimeMean: s.interKeyTimeMean,
      attemptCount: s.attemptCount,
      inputModality: session.inputModality,
    });
  }

  const known = new Set(challenge.options.map((o) => o.id)); // events for other options are not part of this challenge
  const acts = extractOptionActivations(session).filter((a) => known.has(a.id));
  const firstPress = session.events.find(
    (e) => known.has(parseOptionTarget(e.target) ?? "") && ((!isKeyEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );
  let chosen: string | null = null;
  let selections = 0;
  let corrections = 0;
  let firstSelection: number | null = null;
  let rounds = 0;
  let prev = Number.NEGATIVE_INFINITY;
  let gaps = 0;
  acts.forEach((a, i) => {
    if (a.id === chosen) {
      corrections++; // clearing the choice
      chosen = null;
    } else {
      if (chosen !== null) corrections++; // replacing the choice
      chosen = a.id;
      selections++;
      firstSelection ??= a.t;
    }
    if (a.t - prev > TYPING_PAUSE_MS) rounds++;
    if (i > 0) gaps += a.t - prev;
    prev = a.t;
  });
  return createFeatureSet(...version, {
    ...base,
    reactionTime: firstPress?.t ?? null,
    timeToFirstKey: null,
    keyCount: null,
    backspaceCount: null,
    timeToFirstSelection: firstSelection,
    selectionCount: selections,
    correctionCount: corrections,
    interActionTimeMean: acts.length >= 2 ? gaps / (acts.length - 1) : null,
    attemptCount: rounds,
    inputModality: session.inputModality,
  });
}
