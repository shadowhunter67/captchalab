import type { BaseCaptchaFeatures } from "../features/motion";
import type { FeatureSet } from "../features/feature-set";
import type { InteractionSession } from "../types/events";

export interface GenerateContext {
  /** Deterministic PRNG in [0, 1). Generators must use this, never Math.random. */
  rng: () => number;
}

export interface VerificationResult {
  passed: boolean;
  /** Human-readable, educational reason. Safe to show in the Inspect UI. */
  reason: string;
  /** Named numeric details for Inspect (units documented by each plugin). */
  measurements?: Readonly<Record<string, number>>;
}

/**
 * Educational demo contract. The client is not a trusted verification environment;
 * verify() illustrates challenge-correctness logic and is not production anti-abuse security.
 *
 * - verify(): challenge correctness only. Behavioral features never decide pass/fail.
 * - extractFeatures(): behavioral analysis. Receives the challenge because many features are
 *   challenge-relative (release error, final angular error). `TFeatureContext` carries UI
 *   geometry the plugin needs to convert pointer pixels into challenge units.
 * - Challenge/answer types are the plugin's own; coordinates inside them should be UI-size
 *   independent (normalized) so the same challenge renders at any size.
 */
export interface CaptchaPlugin<
  TId extends string,
  TChallenge,
  TAnswer,
  TFeatures extends BaseCaptchaFeatures,
  TFeatureContext = undefined,
> {
  readonly id: TId;
  readonly name: string;
  /** Plugin implementation version (challenge model + verifier). */
  readonly version: string;
  generate(context: GenerateContext): TChallenge;
  verify(
    challenge: TChallenge,
    answer: TAnswer,
    interaction: InteractionSession,
  ): VerificationResult;
  extractFeatures(
    challenge: TChallenge,
    interaction: InteractionSession,
    context: TFeatureContext,
  ): FeatureSet<TFeatures>;
}

export const PLUGIN_BRAND: unique symbol = Symbol("captchalab.plugin");

/**
 * Proof that a plugin went through defineCaptchaPlugin, where TChallenge/TAnswer/TFeatures are
 * checked for coherence across generate/verify/extractFeatures. The registry accepts only
 * branded plugins, because the `unknown`-widened constraint below cannot check that coherence.
 */
export interface PluginBrand {
  readonly [PLUGIN_BRAND]: true;
}

/**
 * Constraint for registry maps only: matches any plugin by widening to `unknown`.
 * It is never the type a consumer receives; `registry.get(id)` returns the exact plugin type.
 * (Method-style members keep parameter bivariance, so concrete plugins satisfy this.)
 */
export type AnyCaptchaPlugin = CaptchaPlugin<string, unknown, unknown, BaseCaptchaFeatures, unknown> &
  PluginBrand;

export type ChallengeOf<P> =
  P extends { generate(context: GenerateContext): infer C } ? C : never;
export type AnswerOf<P> =
  P extends { verify(challenge: never, answer: infer A, interaction: InteractionSession): VerificationResult }
    ? A
    : never;
export type FeaturesOf<P> =
  P extends { extractFeatures(...args: never[]): FeatureSet<infer F> } ? F : never;
export type FeatureContextOf<P> =
  P extends { extractFeatures(challenge: never, interaction: never, context: infer X): unknown } ? X : never;

/**
 * The only way to create a registrable plugin. Preserves the literal `id` and all generics,
 * enforces coherence of the generic parameters, and returns a frozen, branded copy so the id
 * cannot change after registration.
 */
export function defineCaptchaPlugin<
  const TId extends string,
  TChallenge,
  TAnswer,
  TFeatures extends BaseCaptchaFeatures,
  TFeatureContext = undefined,
>(
  plugin: CaptchaPlugin<TId, TChallenge, TAnswer, TFeatures, TFeatureContext>,
): CaptchaPlugin<TId, TChallenge, TAnswer, TFeatures, TFeatureContext> & PluginBrand {
  return Object.freeze({ ...plugin, [PLUGIN_BRAND]: true as const });
}
