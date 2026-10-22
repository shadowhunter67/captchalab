import type { VerificationResult } from "@captchalab/captcha-core";
import type { TextAnswer, TextChallenge } from "./types";

/** The one normalization rule: trim surrounding whitespace, compare case-insensitively. */
export function normalizeText(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Challenge correctness only. Behavioral features and the interaction are never consulted. Both arguments
 * cross a trust boundary and are validated; nothing throws. The reason never repeats the typed text.
 */
export function verifyTextAnswer(challenge: TextChallenge, answer: TextAnswer): VerificationResult {
  if (typeof challenge !== "object" || challenge === null || typeof challenge.text !== "string" || challenge.text.length === 0) {
    return { passed: false, reason: "The challenge is missing or malformed." };
  }
  const typed: unknown = (answer as { text?: unknown } | null | undefined)?.text;
  if (typeof typed !== "string") return { passed: false, reason: "The answer must be text." };
  const passed = normalizeText(typed) === normalizeText(challenge.text);
  return {
    passed,
    reason: passed ? "The text matches (case does not matter)." : "The text does not match.",
    measurements: { expectedLength: challenge.text.length, typedLength: typed.trim().length },
  };
}
