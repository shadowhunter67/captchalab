import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";

export const MATH_LOGIC_ID = "math-logic" as const;
/** Semantic target of the key events recorded from the answer field. */
export const MATH_TARGET = "math-input" as const;

/**
 * Structured expression: the generator builds a tree and the page renders it. Nothing is ever parsed from a
 * string and nothing is passed to eval.
 */
export type MathOp = "+" | "-" | "*";
export type MathExpr = { kind: "num"; value: number } | { kind: "op"; op: MathOp; left: MathExpr; right: MathExpr };

/**
 * arithmetic:  work out `expr`; the answer is its value.
 * comparison:  `expr` and `other` are shown side by side; the answer is the value of the larger one (they differ).
 * `expectedAnswer` is checked against the tree by the verifier, so a challenge that disagrees with itself fails.
 */
export interface MathChallenge {
  id: string;
  kind: "arithmetic" | "comparison";
  expr: MathExpr;
  other?: MathExpr;
  expectedAnswer: number;
  config?: ChallengeConfig;
}

/** What was typed, as text. Parsed strictly by the verifier: an optional minus sign and digits, nothing else. */
export interface MathAnswer {
  value: string;
}

/**
 * MATH FEATURE DEFINITIONS (schema math-logic@1). Same measurements as the Text CAPTCHA, over key events whose
 * target is MATH_TARGET. PRIVACY: character keys are stored by class only ("Digit", "Letter", "Other"), never
 * which digit was pressed. Times in ms.
 *
 * reactionTime      First keydown of any key on the field. null if none.
 * timeToFirstKey    First character-key keydown. null if none.
 * keyCount          Character-key presses.
 * backspaceCount    Presses of Backspace or Delete.
 * correctionCount   Backspace/Delete presses after at least one character key.
 * interKeyTimeMean  Mean gap between consecutive character-key presses. null with fewer than 2.
 * attemptCount      Typing bursts: runs of key presses separated by more than 5 s.
 * inputModality     Session modality.
 *
 * Descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface MathLogicFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstKey: number | null;
  keyCount: number;
  backspaceCount: number;
  correctionCount: number;
  interKeyTimeMean: number | null;
  attemptCount: number;
  inputModality: InputModality;
}

export const MATH_LOGIC_FEATURES_SCHEMA = "math-logic@1";
export const MATH_LOGIC_EXTRACTOR = "math-logic@1";
