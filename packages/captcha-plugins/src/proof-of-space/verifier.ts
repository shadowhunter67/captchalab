import type { VerificationResult } from "@captchalab/captcha-core";
import { MAX_SAMPLES, MAX_SPACE_BYTES, MIN_SAMPLES, MIN_SPACE_BYTES, checksumOfSpace, sampleValues, samplePositions } from "./space";
import type { PosAnswer, PosChallenge } from "./types";

function challengeOk(c: unknown): c is PosChallenge {
  if (typeof c !== "object" || c === null) return false;
  const x = c as Record<string, unknown>;
  if (typeof x.seed !== "number" || !Number.isInteger(x.seed) || x.seed < 0 || x.seed > 0xffffffff) return false;
  // The size bound is what keeps a malformed challenge from driving a huge allocation or a long recomputation.
  if (typeof x.bytes !== "number" || !Number.isInteger(x.bytes) || x.bytes < MIN_SPACE_BYTES || x.bytes > MAX_SPACE_BYTES) return false;
  if (x.kind === "checksum") return x.sampleCount === 0;
  return x.kind === "sample" && typeof x.sampleCount === "number" && Number.isInteger(x.sampleCount) && x.sampleCount >= MIN_SAMPLES && x.sampleCount <= MAX_SAMPLES;
}

/**
 * Checks the proof independently: the expected bytes or checksum are recomputed here from the seed (no buffer is
 * allocated), and the page's own result is never trusted. The interaction is never consulted. Nothing throws.
 */
export function verifyPosAnswer(challenge: PosChallenge, answer: PosAnswer): VerificationResult {
  if (!challengeOk(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const a = answer as { samples?: unknown; checksum?: unknown } | null | undefined;
  if (challenge.kind === "checksum") {
    if (typeof a?.checksum !== "number" || !Number.isInteger(a.checksum) || a.checksum < 0 || a.checksum > 0xffffffff) {
      return { passed: false, reason: "The proof must be a 32-bit checksum." };
    }
    const passed = a.checksum === checksumOfSpace(challenge.seed, challenge.bytes);
    return { passed, reason: passed ? "The checksum matches the space: the proof is valid." : "The checksum does not match the space.", measurements: { bytes: challenge.bytes } };
  }
  const samples = a?.samples;
  if (!Array.isArray(samples) || samples.length !== challenge.sampleCount || !samples.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 255)) {
    return { passed: false, reason: "The proof must list one byte value for each sampled position." };
  }
  const expected = sampleValues(challenge.seed, samplePositions(challenge.seed, challenge.bytes, challenge.sampleCount));
  const correct = expected.filter((v, i) => v === samples[i]).length;
  const passed = correct === expected.length;
  return {
    passed,
    reason: passed ? "Every sampled byte matches the space: the proof is valid." : "Some sampled bytes do not match the space.",
    measurements: { bytes: challenge.bytes, samples: expected.length, correct },
  };
}
