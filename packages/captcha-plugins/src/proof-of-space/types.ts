import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";

export const POS_ID = "proof-of-space" as const;
export const POS_START_TARGET = "pos-start" as const;
export const POS_CANCEL_TARGET = "pos-cancel" as const;

/**
 * Fill a deterministic buffer of `bytes` bytes, then prove you did:
 *   kind "sample":   report the bytes at `sampleCount` positions that are derived from the seed;
 *   kind "checksum": report the FNV-1a checksum of the whole buffer.
 * It shows that a client used memory and time. It does NOT show that a person did it.
 */
export interface PosChallenge {
  id: string;
  /** Unsigned 32-bit seed of the deterministic space. */
  seed: number;
  bytes: number;
  kind: "sample" | "checksum";
  /** Positions reported by a sample proof (0 for a checksum proof). */
  sampleCount: number;
  config?: ChallengeConfig;
}

/** The proof. The verifier recomputes what it needs from the seed; it never trusts the page's own result. */
export interface PosAnswer {
  /** Sample proof: the bytes at the derived positions, in order. */
  samples?: readonly number[];
  /** Checksum proof: the checksum of the whole buffer. */
  checksum?: number;
}

/** What the page measured while filling and deriving the proof. Passed at feature time; never decides pass or fail. */
export interface PosRun {
  allocatedBytes: number;
  fillMs: number;
  /** Time to read the proof back from the buffer. */
  proofMs: number;
  /** Bytes written plus bytes read to build the proof. */
  operations: number;
}

export interface PosFeatureContext {
  run: PosRun | null;
  /** How long the independent verification took, measured by the page. */
  verificationMs: number | null;
}

/**
 * PROOF OF SPACE METRICS (schema proof-of-space@1). These describe the computation, not the person. Only Start and
 * Cancel presses are recorded as events (never one event per byte).
 *
 * reactionTime       ms  First press on Start or Cancel, session clock. null if none.
 * startCount             Presses of Start.
 * cancelCount            Presses of Cancel.
 * attemptCount           Same as startCount (kept for the common feature name).
 * allocatedBytes         Size of the buffer the successful run allocated. null if no run finished.
 * fillTime           ms  Time to fill the buffer. null if none.
 * verificationTime   ms  Time the independent verification took. null if none.
 * totalTime          ms  fillTime + proof time + verificationTime. null if any part is missing.
 * operations             Bytes written plus bytes read for the proof. null if none.
 */
export interface PosFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  startCount: number;
  cancelCount: number;
  attemptCount: number;
  allocatedBytes: number | null;
  fillTime: number | null;
  verificationTime: number | null;
  totalTime: number | null;
  operations: number | null;
  inputModality: InputModality;
}

export const POS_FEATURES_SCHEMA = "proof-of-space@1";
export const POS_EXTRACTOR = "proof-of-space@1";
