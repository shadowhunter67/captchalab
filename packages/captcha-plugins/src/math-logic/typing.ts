import { isKeyEvent, type InteractionSession } from "@captchalab/captcha-core";
import { TEXT_CHAR_CODES } from "../text/types";

export const TYPING_PAUSE_MS = 5000;

export interface TypingStats {
  reactionTime: number | null;
  timeToFirstKey: number | null;
  keyCount: number;
  backspaceCount: number;
  correctionCount: number;
  interKeyTimeMean: number | null;
  attemptCount: number;
}

const isCharacterKey = (code: string): boolean => code === TEXT_CHAR_CODES.letter || code === TEXT_CHAR_CODES.digit || code === TEXT_CHAR_CODES.other;

/** Typing measurements over the key events aimed at `target` (the same rules as the Text CAPTCHA). */
export function typingStats(session: InteractionSession, target: string): TypingStats {
  const downs = session.events.filter((e) => isKeyEvent(e) && e.type === "keydown" && e.target === target);
  const chars = downs.filter((e) => isKeyEvent(e) && isCharacterKey(e.code));
  const deletes = downs.filter((e) => isKeyEvent(e) && (e.code === "Backspace" || e.code === "Delete"));
  const firstChar = chars[0];
  let gaps = 0;
  for (let i = 1; i < chars.length; i++) gaps += (chars[i] as { t: number }).t - (chars[i - 1] as { t: number }).t;
  let bursts = 0;
  let prev = Number.NEGATIVE_INFINITY;
  for (const d of downs) {
    if (d.t - prev > TYPING_PAUSE_MS) bursts++;
    prev = d.t;
  }
  return {
    reactionTime: downs[0]?.t ?? null,
    timeToFirstKey: firstChar?.t ?? null,
    keyCount: chars.length,
    backspaceCount: deletes.length,
    correctionCount: firstChar ? deletes.filter((d) => d.t >= firstChar.t).length : 0,
    interKeyTimeMean: chars.length >= 2 ? gaps / (chars.length - 1) : null,
    attemptCount: bursts,
  };
}
