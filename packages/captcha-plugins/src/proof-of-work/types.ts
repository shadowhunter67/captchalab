import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";

export const POW_ID = "proof-of-work" as const;
export const POW_START_TARGET = "pow-start" as const;
export const POW_CANCEL_TARGET = "pow-cancel" as const;

/**
 * Find a number (the nonce) so that SHA-256 of `${input}:${nonce}` meets the difficulty:
 *   kind "prefix": the hex digest starts with `prefix` (for example "000").
 *   kind "bits":   the digest starts with at least `bits` zero bits.
 * This shows that a client did some work. It does NOT show that a person did it.
 */
export interface PowChallenge {
  id: string;
  /** Random text fixed by the challenge, 16 hex characters. */
  input: string;
  algorithm: "SHA-256";
  kind: "prefix" | "bits";
  /** Required hex prefix for kind "prefix"; empty for kind "bits". */
  prefix: string;
  /** Required leading zero bits for kind "bits"; 0 for kind "prefix". */
  bits: number;
  config?: ChallengeConfig;
}

/** The proof: only the nonce. The verifier recomputes the hash itself. */
export interface PowAnswer {
  nonce: number;
}

/** What the page measured while computing. Passed at feature time; it never decides pass or fail. */
export interface PowRun {
  nonce: number;
  /** Hashes computed, counting the one that succeeded. */
  iterations: number;
  computationMs: number;
}

export interface PowFeatureContext {
  run: PowRun | null;
}

/**
 * PROOF OF WORK METRICS (schema proof-of-work@1). These describe the computation, not the person. Only Start and
 * Cancel presses are recorded as events (never one event per hash).
 *
 * reactionTime          First press on Start or Cancel, session clock. null if none.
 * startCount            Presses of Start (attempts to run the work).
 * cancelCount           Presses of Cancel.
 * attemptCount          Same as startCount (kept for the common feature name).
 * computationTime  ms   Time the successful run took (from the page). null if no run finished.
 * iterations            Hashes the successful run computed. null if none.
 * iterationsPerSecond   iterations / computation time. null if either is missing or the time is zero.
 * nonce                 The nonce found. null if none.
 * hashPrefix            The first 12 hex characters of the winning hash. null if none.
 *
 * Difficulty, algorithm and the required prefix or bits are challenge configuration, not metrics.
 */
export interface PowFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  startCount: number;
  cancelCount: number;
  attemptCount: number;
  computationTime: number | null;
  iterations: number | null;
  iterationsPerSecond: number | null;
  nonce: number | null;
  hashPrefix: string | null;
  inputModality: InputModality;
}

export const POW_FEATURES_SCHEMA = "proof-of-work@1";
export const POW_EXTRACTOR = "proof-of-work@1";
