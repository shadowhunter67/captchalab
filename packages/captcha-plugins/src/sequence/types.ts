import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";
import type { GridShape } from "../image-grid/types";

export const SEQUENCE_ID = "sequence" as const;
/** Semantic target of key events from the number field. */
export const SEQUENCE_TARGET = "sequence-input" as const;
/** Semantic target of events on the visual answer options: "seq-option:<id>". */
export const OPTION_PREFIX = "seq-option:" as const;
export const makeOptionTarget = (id: string): string => `${OPTION_PREFIX}${id}`;
export function parseOptionTarget(target: string | undefined): string | null {
  if (target === undefined || !target.startsWith(OPTION_PREFIX)) return null;
  const id = target.slice(OPTION_PREFIX.length);
  return /^[a-z0-9-]{1,16}$/.test(id) ? id : null;
}

/** The families of number patterns, simplest first. A challenge uses one; simpler ones must not contradict it. */
export type NumberRule = "arithmetic" | "geometric" | "alternating" | "interleaved";

/**
 * A number sequence with one hidden term (`null` in `terms`). The first two terms are always visible, and the
 * hidden one is never the first. `expectedAnswer` is the hidden value.
 */
export interface SequenceNumberChallenge {
  id: string;
  kind: "number";
  terms: readonly (number | null)[];
  hiddenIndex: number;
  expectedAnswer: number;
  rule: NumberRule;
  config?: ChallengeConfig;
}

export interface SequenceOption {
  id: string;
  shape: GridShape;
}

/** A shape sequence with one hidden position; the user picks the missing shape from `options`. */
export interface SequenceVisualChallenge {
  id: string;
  kind: "visual";
  cells: readonly (GridShape | null)[];
  hiddenIndex: number;
  options: readonly SequenceOption[];
  expectedOptionId: string;
  /** The repeating unit that generated it, e.g. "ABCB" (display for Inspect only). */
  pattern: string;
  config?: ChallengeConfig;
}

export type SequenceChallenge = SequenceNumberChallenge | SequenceVisualChallenge;

export type SequenceAnswer = { kind: "number"; value: number } | { kind: "option"; optionId: string };

/**
 * SEQUENCE FEATURE DEFINITIONS (schema sequence@1). One feature set for both variants; a field that does not
 * apply to the variant is null. Times ms on the session clock.
 *
 * Number (key events on SEQUENCE_TARGET, same rules as the Text CAPTCHA; character keys stored by class only):
 *   reactionTime, timeToFirstKey, keyCount, backspaceCount, correctionCount, interActionTimeMean (mean gap
 *   between character keys), attemptCount (typing bursts separated by more than 5 s).
 * Visual (presses on the options, or Space/Enter on one):
 *   reactionTime (first press), timeToFirstSelection, selectionCount (activations that chose an option),
 *   correctionCount (a choice that replaced or cleared an earlier choice), interActionTimeMean (mean gap
 *   between activations), attemptCount (rounds separated by more than 5 s).
 *
 * Descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface SequenceFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstKey: number | null;
  keyCount: number | null;
  backspaceCount: number | null;
  timeToFirstSelection: number | null;
  selectionCount: number | null;
  correctionCount: number;
  interActionTimeMean: number | null;
  attemptCount: number;
  inputModality: InputModality;
}

export const SEQUENCE_FEATURES_SCHEMA = "sequence@1";
export const SEQUENCE_EXTRACTOR = "sequence@1";
