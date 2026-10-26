import type { VerificationResult } from "@captchalab/captcha-core";
import type { AudioAnswer, AudioChallenge } from "./types";

/** Exactly the digits, after trimming surrounding whitespace. "4 7 2", "472x" and "" all fail. */
export function normalizeDigits(value: string): string {
  return value.trim();
}

/**
 * Challenge correctness only. The interaction is never consulted; both arguments cross a trust boundary and nothing
 * throws. The reason never repeats what was typed or what the digits are.
 */
export function verifyAudioAnswer(challenge: AudioChallenge, answer: AudioAnswer): VerificationResult {
  if (typeof challenge !== "object" || challenge === null || typeof challenge.digits !== "string" || !/^\d{3,8}$/.test(challenge.digits)) {
    return { passed: false, reason: "The challenge is missing or malformed." };
  }
  const typed: unknown = (answer as { value?: unknown } | null | undefined)?.value;
  if (typeof typed !== "string") return { passed: false, reason: "The answer must be text." };
  const value = normalizeDigits(typed);
  if (!/^\d+$/.test(value)) return { passed: false, reason: "The answer must be digits only." };
  const passed = value === challenge.digits;
  return { passed, reason: passed ? "The digits match what was played." : "The digits do not match what was played." };
}
