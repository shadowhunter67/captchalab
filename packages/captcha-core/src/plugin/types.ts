import type { BaseCaptchaFeatures } from "../features/motion";
import type { InteractionSession } from "../types/events";

export interface GenerateContext {
  /** Deterministic PRNG in [0, 1). Generators must use this, never Math.random. */
  rng: () => number;
  /** Challenge surface size in CSS px. */
  width: number;
  height: number;
}

export interface FeatureContext {
  width?: number;
  height?: number;
}

export interface VerificationResult {
  passed: boolean;
  /** Human-readable, educational reason. Safe to show in the Inspect UI. */
  reason?: string;
}

/**
 * Educational demo contract. The client is not a trusted verification environment;
 * verify() illustrates logic and is not production anti-abuse security.
 */
export interface CaptchaPlugin<TChallenge, TAnswer, TFeatures extends BaseCaptchaFeatures> {
  id: string;
  name: string;
  version: string;
  generate(context: GenerateContext): TChallenge;
  verify(
    challenge: TChallenge,
    answer: TAnswer,
    interaction: InteractionSession,
  ): VerificationResult;
  extractFeatures(interaction: InteractionSession, context?: FeatureContext): TFeatures;
}

/** Type-erased form for heterogeneous registries; callers narrow by plugin id. */
export type AnyCaptchaPlugin = CaptchaPlugin<never, never, BaseCaptchaFeatures>;
