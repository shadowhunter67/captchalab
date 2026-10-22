import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  ATTEMPT_PAUSE_MS,
  TEXT_CHAR_CODES,
  TEXT_EXTRACTOR,
  TEXT_FEATURES_SCHEMA,
  TEXT_TARGET,
  type TextChallenge,
  type TextFeatures,
} from "./types";

export const isCharacterKey = (code: string): boolean => code === TEXT_CHAR_CODES.letter || code === TEXT_CHAR_CODES.digit || code === TEXT_CHAR_CODES.other;
const isDeleteKey = (code: string): boolean => code === "Backspace" || code === "Delete";

/** See the definitions in ./types.ts. Uses only key codes and times; the challenge is not needed. */
export function extractTextFeatures(_challenge: TextChallenge, session: InteractionSession): FeatureSet<TextFeatures> {
  const downs = session.events.filter((e) => isKeyEvent(e) && e.type === "keydown" && e.target === TEXT_TARGET);
  const chars = downs.filter((e) => isKeyEvent(e) && isCharacterKey(e.code));
  const deletes = downs.filter((e) => isKeyEvent(e) && isDeleteKey(e.code));
  const firstChar = chars[0];
  const corrections = firstChar ? deletes.filter((d) => d.t >= firstChar.t).length : 0;

  let gaps = 0;
  for (let i = 1; i < chars.length; i++) gaps += (chars[i] as { t: number }).t - (chars[i - 1] as { t: number }).t;
  let bursts = 0;
  let prevT = Number.NEGATIVE_INFINITY;
  for (const d of downs) {
    if (d.t - prevT > ATTEMPT_PAUSE_MS) bursts++;
    prevT = d.t;
  }

  return createFeatureSet(composeVersion(TEXT_FEATURES_SCHEMA), composeVersion(TEXT_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: downs[0]?.t ?? null,
    timeToFirstKey: firstChar?.t ?? null,
    keyCount: chars.length,
    backspaceCount: deletes.length,
    correctionCount: corrections,
    interKeyTimeMean: chars.length >= 2 ? gaps / (chars.length - 1) : null,
    attemptCount: bursts,
    inputModality: session.inputModality,
  });
}
