import { sha256Hex } from "./sha256";
import type { PowChallenge } from "./types";

/** The text that is hashed for a nonce. */
export const powInput = (challenge: Pick<PowChallenge, "input">, nonce: number): string => `${challenge.input}:${nonce}`;

export const powHash = (challenge: Pick<PowChallenge, "input">, nonce: number): string => sha256Hex(powInput(challenge, nonce));

/** True when the hex digest has at least `bits` leading zero bits. */
export function hasLeadingZeroBits(hex: string, bits: number): boolean {
  let remaining = bits;
  for (let i = 0; i < hex.length && remaining > 0; i++) {
    const nibble = parseInt(hex[i] as string, 16);
    if (Number.isNaN(nibble)) return false;
    if (remaining >= 4) {
      if (nibble !== 0) return false;
      remaining -= 4;
    } else {
      return nibble >> (4 - remaining) === 0;
    }
  }
  return remaining <= 0;
}

/** Does this digest meet the challenge's difficulty? */
export function meetsDifficulty(challenge: Pick<PowChallenge, "kind" | "prefix" | "bits">, hex: string): boolean {
  return challenge.kind === "prefix" ? hex.startsWith(challenge.prefix) : hasLeadingZeroBits(hex, challenge.bits);
}

/**
 * Tries nonces from `from` up to (not including) `from + count`. Returns the first nonce that works, or null.
 * A page calls this in small chunks so it can stay responsive and be cancelled; the first valid nonce for a
 * challenge is always the same.
 */
export function searchNonces(challenge: PowChallenge, from: number, count: number): number | null {
  for (let n = from; n < from + count; n++) {
    if (meetsDifficulty(challenge, powHash(challenge, n))) return n;
  }
  return null;
}
