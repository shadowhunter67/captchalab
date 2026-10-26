import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { typingStats } from "../math-logic/typing";
import { AUDIO_EXTRACTOR, AUDIO_FEATURES_SCHEMA, AUDIO_PLAY_TARGET, AUDIO_TARGET, type AudioChallenge, type AudioFeatures } from "./types";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

/** Times of completed presses and Space/Enter keydowns on the Play/Replay button, in order. */
export function extractPlayTimes(session: InteractionSession): number[] {
  const out: { t: number; index: number }[] = [];
  for (const g of extractGestures(session)) {
    const last = g.events[g.events.length - 1];
    if (g.target === AUDIO_PLAY_TARGET && g.endedBy === "up" && last?.target === AUDIO_PLAY_TARGET) out.push({ t: g.endT, index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code) && e.target === AUDIO_PLAY_TARGET) out.push({ t: e.t, index });
  });
  return out.sort((a, b) => a.t - b.t || a.index - b.index).map((p) => p.t);
}

/** See the definitions in ./types.ts. Uses only key codes, press times and the session length. */
export function extractAudioFeatures(_challenge: AudioChallenge, session: InteractionSession): FeatureSet<AudioFeatures> {
  const plays = extractPlayTimes(session);
  const typing = typingStats(session, AUDIO_TARGET);
  const firstPress = session.events.find(
    (e) => e.target === AUDIO_PLAY_TARGET && ((!isKeyEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );
  const candidates = [firstPress?.t, typing.reactionTime].filter((t): t is number => typeof t === "number");
  const lastPlay = plays.at(-1);
  return createFeatureSet(composeVersion(AUDIO_FEATURES_SCHEMA), composeVersion(AUDIO_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: candidates.length > 0 ? Math.min(...candidates) : null,
    timeToFirstPlay: plays[0] ?? null,
    playCount: plays.length,
    timeToFirstKey: typing.timeToFirstKey,
    keyCount: typing.keyCount,
    backspaceCount: typing.backspaceCount,
    correctionCount: typing.correctionCount,
    attemptCount: typing.attemptCount,
    timeFromLastPlayToEnd: lastPlay === undefined ? null : Math.max(0, session.durationMs - lastPlay),
    inputModality: session.inputModality,
  });
}
