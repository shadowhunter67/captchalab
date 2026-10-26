import type { VerificationResult } from "@captchalab/captcha-core";
import { meetsDifficulty, powHash } from "./pow";
import type { PowAnswer, PowChallenge } from "./types";

const MAX_NONCE = 2 ** 40;

function challengeOk(c: unknown): c is PowChallenge {
  if (typeof c !== "object" || c === null) return false;
  const x = c as Record<string, unknown>;
  if (typeof x.input !== "string" || !/^[0-9a-f]{16}$/.test(x.input) || x.algorithm !== "SHA-256") return false;
  if (x.kind === "prefix") return typeof x.prefix === "string" && /^0{1,6}$/.test(x.prefix);
  if (x.kind === "bits") return typeof x.bits === "number" && Number.isInteger(x.bits) && x.bits >= 1 && x.bits <= 24;
  return false;
}

/**
 * Checks the proof independently: the hash is recomputed here from the challenge and the claimed nonce, and the
 * result of the page's own search is never trusted. The interaction is never consulted. Nothing throws.
 */
export function verifyPowAnswer(challenge: PowChallenge, answer: PowAnswer): VerificationResult {
  if (!challengeOk(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const nonce: unknown = (answer as { nonce?: unknown } | null | undefined)?.nonce;
  if (typeof nonce !== "number" || !Number.isSafeInteger(nonce) || nonce < 0 || nonce > MAX_NONCE) {
    return { passed: false, reason: "The proof must be a whole number nonce." };
  }
  const passed = meetsDifficulty(challenge, powHash(challenge, nonce));
  return { passed, reason: passed ? "The hash meets the difficulty: the proof is valid." : "The hash does not meet the difficulty." };
}
