import type { ChallengeConfig, BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";

export const TEXT_ID = "text" as const;
/** Semantic target of the key events recorded from the answer field. */
export const TEXT_TARGET = "text-input" as const;
/** Characters the generator uses: no 0/O, 1/I/l look-alikes. */
export const TEXT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface TextGlyph {
  char: string;
  /** Rotation in degrees, small. */
  rotate: number;
  /** Vertical offset as a fraction of the glyph height, in [-0.12, 0.12]. */
  dy: number;
}

export interface TextNoiseLine {
  /** Endpoints as fractions of the image width/height. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The text to read, plus the deterministic distortion used to draw it (so the same seed always looks the
 * same). `text` is the expected answer: this is a lab demo, not a place to hide secrets.
 */
export interface TextChallenge {
  id: string;
  text: string;
  glyphs: readonly TextGlyph[];
  noise: readonly TextNoiseLine[];
  /** How it was generated (variant, difficulty, parameters). Absent on hand-built challenges. */
  config?: ChallengeConfig;
}

/** What the user typed. Compared case-insensitively after trimming (see verifier.ts). */
export interface TextAnswer {
  text: string;
}

/**
 * TEXT FEATURE DEFINITIONS (schema text@1). Times ms, from the session clock. Only key events whose target is
 * TEXT_TARGET count. PRIVACY: the recorded `code` of a character key is coarsened BEFORE it is stored
 * (toTextKeyCode): every letter key becomes "Letter", every digit key "Digit" and any other printable key
 * (punctuation) "Other". The typed text therefore cannot be recovered from the recording, not even letter by
 * letter. Only control keys (Backspace, Delete, Enter, Shift, arrows, ...) keep their code.
 *
 * Key press: a keydown (auto-repeat keydowns count as presses).
 * Character key: a press recorded as "Letter", "Digit" or "Other".
 *
 * reactionTime       ms  First keydown of any key on the field. null if none.
 * timeToFirstKey     ms  First character-key keydown. null if none.
 * completionTime         (base) the whole session, ms.
 * keyCount               Character-key presses.
 * backspaceCount         Presses of Backspace or Delete.
 * correctionCount        Backspace/Delete presses that came after at least one character key (deleting
 *                        something that had been typed). Equal to backspaceCount except for leading deletes.
 * interKeyTimeMean   ms  Mean gap between consecutive character-key presses. null with fewer than 2.
 * attemptCount           Typing bursts: runs of key presses separated by more than ATTEMPT_PAUSE_MS. 0 with no key
 *                        presses. (Verify clicks are not key events, so submissions are not observable here.)
 * inputModality          Session modality (core inferModality).
 */
export interface TextFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstKey: number | null;
  keyCount: number;
  backspaceCount: number;
  correctionCount: number;
  interKeyTimeMean: number | null;
  attemptCount: number;
  inputModality: InputModality;
}

export const ATTEMPT_PAUSE_MS = 5000;
export const TEXT_CHAR_CODES = { letter: "Letter", digit: "Digit", other: "Other" } as const;

/** Keys whose exact code is kept: they control editing/navigation and do not reveal typed content. */
const CONTROL_KEYS =
  /^(Backspace|Delete|Insert|Enter|NumpadEnter|Tab|Escape|Space|CapsLock|Home|End|PageUp|PageDown|Arrow(Up|Down|Left|Right)|(Shift|Control|Alt|Meta)(Left|Right))$/;

/**
 * The code that is stored for a physical key. Character keys are reduced to their class (letters ->
 * "Letter", digits and numpad digits -> "Digit", any other printable/unknown key such as punctuation ->
 * "Other"); only the control keys above keep their code.
 */
export function toTextKeyCode(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return TEXT_CHAR_CODES.letter;
  if (/^(Digit[0-9]|Numpad[0-9])$/.test(code)) return TEXT_CHAR_CODES.digit;
  return CONTROL_KEYS.test(code) ? code : TEXT_CHAR_CODES.other;
}
export const TEXT_FEATURES_SCHEMA = "text@1";
export const TEXT_EXTRACTOR = "text@1";
