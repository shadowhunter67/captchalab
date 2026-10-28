import { createRng, type InteractionSession, type Point } from "@captchalab/captcha-core";
import {
  AUDIO_PLAY_TARGET,
  AUDIO_TARGET,
  MATH_TARGET,
  MEMORY_START_TARGET,
  MEMORY_UNDO_TARGET,
  SEQUENCE_TARGET,
  TEXT_CHAR_CODES,
  makeMemoryCellTarget,
  makeMemoryOptionTarget,
  makeOptionTarget,
  makeSourceTarget,
  makeTargetTarget,
  type AudioChallenge,
  type MathChallenge,
  type MemoryChallenge,
  type SequenceChallenge,
  type ShapeMatchingChallenge,
} from "@captchalab/captcha-plugins";
import type { MemoryContext } from "../types";
import { Events, between, toSession } from "./generators";

/**
 * Synthetic sessions for the five CAPTCHAs added in v0.7. Same rules as generators.ts: generated data written
 * straight into the normalized event format, no DOM event, same inputs give the same session. The generators know the
 * answer only because the lab made the challenge.
 */

/** Profiles shared by the click-style CAPTCHAs (Shape Matching, Sequence visual, Memory). */
export const CLICK_PROFILES = ["immediate", "uniform-interval", "variable-interval"] as const;
export type ClickProfile = (typeof CLICK_PROFILES)[number];
/** Profiles of the typing-style CAPTCHAs (Math / Logic, Audio). */
export const TYPING_PROFILES = ["uniform-typing", "variable-typing", "correction-typing"] as const;
export type TypingProfile = (typeof TYPING_PROFILES)[number];
/** Sequence offers both a typed and a clicked variant, so its profiles are about timing, not about keys or clicks. */
export const SEQUENCE_PROFILES = ["immediate", "uniform-timing", "variable-timing"] as const;
export type SequenceProfile = (typeof SEQUENCE_PROFILES)[number];

const POINT: Point = { x: 40, y: 30 };

/** One press and release on a semantic target. */
function press(ev: Events, t: number, hold: number, target: string): void {
  ev.pointer("pointerdown", t, POINT, target);
  ev.pointer("pointerup", t + hold, POINT, target);
}

interface Timing {
  start: number;
  gap: () => number;
  hold: () => number;
}

function clickTiming(profile: ClickProfile, rng: () => number): Timing {
  if (profile === "immediate") return { start: 100, gap: () => 60, hold: () => 12 };
  if (profile === "uniform-interval") return { start: 800, gap: () => 700, hold: () => 90 };
  return { start: between(rng, 900, 1800), gap: () => between(rng, 400, 1600), hold: () => between(rng, 60, 140) };
}

function sequenceTiming(profile: SequenceProfile, rng: () => number): Timing {
  if (profile === "immediate") return { start: 100, gap: () => 70, hold: () => 12 };
  if (profile === "uniform-timing") return { start: 900, gap: () => 600, hold: () => 90 };
  return { start: between(rng, 900, 1800), gap: () => between(rng, 300, 1500), hold: () => between(rng, 60, 140) };
}

/** Coarse key class the recorders store for a character. */
const charClass = (ch: string): string => (/[0-9]/.test(ch) ? TEXT_CHAR_CODES.digit : /[A-Za-z]/.test(ch) ? TEXT_CHAR_CODES.letter : TEXT_CHAR_CODES.other);

interface TypeOptions {
  profile: TypingProfile | "immediate" | "uniform-timing" | "variable-timing";
  text: string;
  target: string;
  rng: () => number;
  /** When the first key is struck. */
  start?: number;
}

/** Types `text` into a field with the given rhythm. correction-typing (and variable timing on a long answer) deletes one wrong key. */
function typeInto(ev: Events, o: TypeOptions): number {
  const uniform = o.profile === "uniform-typing" || o.profile === "uniform-timing";
  const fast = o.profile === "immediate";
  const correct = o.profile === "correction-typing";
  const key = (t: number, code: string, dwell: number): void => {
    ev.key("keydown", t, code, o.target);
    ev.key("keyup", t + dwell, code, o.target);
  };
  const gap = (): number => (fast ? 70 : uniform ? 180 : between(o.rng, 120, 420));
  const dwell = (): number => (fast ? 10 : uniform ? 70 : between(o.rng, 50, 120));
  const chars = [...o.text];
  const mistakeAt = correct ? Math.min(chars.length - 1, 1 + Math.floor(o.rng() * Math.max(1, chars.length - 1))) : -1;
  let t = o.start ?? (fast ? 100 : uniform ? 600 : between(o.rng, 700, 1500));
  chars.forEach((ch, i) => {
    if (i === mistakeAt) {
      key(t, TEXT_CHAR_CODES.digit, dwell());
      t += between(o.rng, 500, 900); // notices the mistake
      key(t, "Backspace", dwell());
      t += gap();
    }
    key(t, charClass(ch), dwell());
    t += gap();
  });
  const enter = t + (fast ? 120 : uniform ? 300 : between(o.rng, 300, 700));
  key(enter, "Enter", 60);
  return enter;
}

// ------------------------------------------------------------------------------------------ Shape Matching

export function generateSyntheticShapeMatchingSession(opts: { profile: ClickProfile; challenge: ShapeMatchingChallenge; seed?: number }): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const timing = clickTiming(profile, rng);
  let t = timing.start;
  const wrongTarget = (own: string): string | undefined => challenge.targets.find((x) => x.id !== own)?.id;
  const sources = challenge.sources.map((s) => s.id);
  // The variable profile pairs one source with a wrong target first, then replaces it (a correction).
  const mistaken = profile === "variable-interval" && sources.length > 0 ? Math.floor(rng() * sources.length) : -1;
  sources.forEach((id, i) => {
    const own = challenge.matches[id] as string;
    if (i === mistaken) {
      const wrong = wrongTarget(own);
      if (wrong) {
        press(ev, t, timing.hold(), makeSourceTarget(id));
        t += timing.gap();
        press(ev, t, timing.hold(), makeTargetTarget(wrong));
        t += timing.gap();
      }
    }
    press(ev, t, timing.hold(), makeSourceTarget(id));
    t += timing.gap();
    press(ev, t, timing.hold(), makeTargetTarget(own));
    t += timing.gap();
  });
  return toSession("shape-matching", profile, ev);
}

// --------------------------------------------------------------------------------------------- Math / Logic

export function generateSyntheticMathSession(opts: { profile: TypingProfile; challenge: MathChallenge; seed?: number }): InteractionSession {
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  typeInto(ev, { profile: opts.profile, text: String(opts.challenge.expectedAnswer), target: MATH_TARGET, rng });
  return toSession("math-logic", opts.profile, ev);
}

// -------------------------------------------------------------------------------------------------- Sequence

export function generateSyntheticSequenceSession(opts: { profile: SequenceProfile; challenge: SequenceChallenge; seed?: number }): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  if (challenge.kind === "number") {
    // A longer answer would be needed for a correction to be meaningful; variable timing keeps one only when it can.
    typeInto(ev, { profile: profile === "variable-timing" ? "variable-typing" : profile, text: String(challenge.expectedAnswer), target: SEQUENCE_TARGET, rng });
  } else {
    const timing = sequenceTiming(profile, rng);
    let t = timing.start;
    const wrong = challenge.options.find((o) => o.id !== challenge.expectedOptionId);
    if (profile === "variable-timing" && wrong) {
      press(ev, t, timing.hold(), makeOptionTarget(wrong.id)); // chooses a wrong option, then changes its mind
      t += timing.gap();
    }
    press(ev, t, timing.hold(), makeOptionTarget(challenge.expectedOptionId));
  }
  return toSession("sequence", profile, ev);
}

// ----------------------------------------------------------------------------------------------------- Memory

const MEMORY_START_T = 300;
const MEMORY_START_HOLD = 10;

/** When recall begins for a challenge: after the Start press and the preview. The same for every profile. */
export function memoryContext(challenge: MemoryChallenge): MemoryContext {
  return { recallStartMs: MEMORY_START_T + MEMORY_START_HOLD + challenge.previewMs };
}

export function generateSyntheticMemorySession(opts: { profile: ClickProfile; challenge: MemoryChallenge; seed?: number }): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const timing = clickTiming(profile, rng);
  press(ev, MEMORY_START_T, MEMORY_START_HOLD, MEMORY_START_TARGET);
  let t = (memoryContext(challenge).recallStartMs as number) + timing.start;
  if (challenge.kind === "sequence") {
    const wrongOption = challenge.options.find((o) => o.id !== challenge.sequence[0])?.id;
    challenge.sequence.forEach((id, i) => {
      if (profile === "variable-interval" && i === 0 && wrongOption) {
        press(ev, t, timing.hold(), makeMemoryOptionTarget(wrongOption)); // a wrong pick, taken back with Undo
        t += timing.gap();
        press(ev, t, timing.hold(), MEMORY_UNDO_TARGET);
        t += timing.gap();
      }
      press(ev, t, timing.hold(), makeMemoryOptionTarget(id));
      t += timing.gap();
    });
  } else {
    const nonTarget = Array.from({ length: challenge.size * challenge.size }, (_, i) => `c${i + 1}`).find((c) => !challenge.targets.includes(c));
    challenge.targets.forEach((id, i) => {
      if (profile === "variable-interval" && i === 0 && nonTarget) {
        press(ev, t, timing.hold(), makeMemoryCellTarget(nonTarget)); // selects a wrong cell, then deselects it
        t += timing.gap();
        press(ev, t, timing.hold(), makeMemoryCellTarget(nonTarget));
        t += timing.gap();
      }
      press(ev, t, timing.hold(), makeMemoryCellTarget(id));
      t += timing.gap();
    });
  }
  return toSession("memory", profile, ev);
}

// ------------------------------------------------------------------------------------------------------ Audio

export function generateSyntheticAudioSession(opts: { profile: TypingProfile; challenge: AudioChallenge; seed?: number }): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const uniform = profile === "uniform-typing";
  const playAt = uniform ? 500 : between(rng, 500, 1400);
  press(ev, playAt, uniform ? 90 : between(rng, 60, 140), AUDIO_PLAY_TARGET);
  // The clips take time to play before the answer is typed.
  const clipMs = challenge.digits.length * (500 + challenge.gapMs);
  if (profile !== "uniform-typing") press(ev, playAt + clipMs + between(rng, 400, 1200), between(rng, 60, 140), AUDIO_PLAY_TARGET); // replays once
  typeInto(ev, { profile, text: challenge.digits, target: AUDIO_TARGET, rng, start: playAt + clipMs + (uniform ? 700 : 2600 + between(rng, 0, 1500)) });
  return toSession("audio", profile, ev);
}
