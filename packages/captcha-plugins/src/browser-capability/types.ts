import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";

export const BC_ID = "browser-capability" as const;
export const BC_RUN_TARGET = "bc-run" as const;

/**
 * Every check is a yes/no answer to "does this browser offer this API?". Nothing is read from the API, nothing is
 * created with it, and no value is kept: this is a feature check, not a fingerprint.
 */
export const BC_CHECK_IDS = ["javascript", "compute", "webcrypto", "canvas", "worker", "webaudio", "pointer"] as const;
export type BcCheckId = (typeof BC_CHECK_IDS)[number];

export interface BcChallenge {
  id: string;
  /** Unsigned 32-bit seed of the small local computation. */
  seed: number;
  /** The checks this challenge asks for, in display order. */
  checks: readonly BcCheckId[];
  /** Loop length of the local computation. Bounded by the verifier. */
  workload: number;
  config?: ChallengeConfig;
}

export interface BcAnswer {
  /** One boolean per asked check. */
  checks: Readonly<Partial<Record<BcCheckId, boolean>>>;
  /** Result of the local computation (see ./capability). */
  computed?: number;
}

export interface BcRun {
  /** Time to run the availability checks. */
  probeMs: number;
  /** Time of the local computation. */
  computeMs: number;
}

export interface BcFeatureContext {
  run: BcRun | null;
  /** How many asked checks the verifier found available. */
  supported: number | null;
}

/**
 * BROWSER CAPABILITY METRICS (schema browser-capability@1). They describe what the browser offers, not the person.
 *
 * reactionTime  ms  First press of Run, session clock. null if none.
 * runCount          Presses of Run.
 * attemptCount      Same as runCount (common feature name).
 * checkCount        Checks the challenge asked for.
 * supportedCount    Checks that came back available. null if no run finished.
 * probeTime     ms  Time to run the availability checks. null if none.
 * computeTime   ms  Time of the local computation. null if none.
 */
export interface BcFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  runCount: number;
  attemptCount: number;
  checkCount: number;
  supportedCount: number | null;
  probeTime: number | null;
  computeTime: number | null;
  inputModality: InputModality;
}

export const BC_FEATURES_SCHEMA = "browser-capability@1";
export const BC_EXTRACTOR = "browser-capability@1";
