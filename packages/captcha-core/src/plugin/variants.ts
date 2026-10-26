/**
 * Variants and difficulty. Intentionally small:
 *
 *   captcha  ->  variant  ->  difficulty  ->  config (plain numbers/flags)
 *   config + seed  ->  challenge
 *
 * Difficulty is a PRESET per variant (never a score). Each plugin decides what easy/medium/hard mean for its
 * own challenge, and a variant may support only some levels (e.g. a checkbox has no meaningful "hard").
 * Difficulty changes the challenge only; it never feeds the verdict or the behavioral features.
 */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type CaptchaDifficulty = (typeof DIFFICULTIES)[number];

export const isDifficulty = (v: unknown): v is CaptchaDifficulty => typeof v === "string" && (DIFFICULTIES as readonly string[]).includes(v);

export type ParameterValue = string | number | boolean;
/** A flat set of named parameters, safe to show in the UI. Never raw interaction data. */
export type VariantParameters = Readonly<Record<string, ParameterValue>>;

export interface CaptchaVariant<TConfig extends VariantParameters = VariantParameters> {
  id: string;
  name: string;
  description: string;
  /** Missing levels are not supported by this variant. */
  difficulties: Partial<Record<CaptchaDifficulty, TConfig>>;
}

export interface VariantSelection {
  variantId: string;
  difficulty: CaptchaDifficulty;
}

export interface CaptchaVariantSet<TConfig extends VariantParameters = VariantParameters> {
  variants: readonly CaptchaVariant<TConfig>[];
  /** What `plugin.generate({ rng })` uses when no variant/difficulty is given. */
  defaultSelection: VariantSelection;
}

/** Stored on every generated challenge so Inspect can show how it was made. */
export interface ChallengeConfig {
  variantId: string;
  difficulty: CaptchaDifficulty;
  parameters: VariantParameters;
  /** Set by the app that chose the seed (a generator only sees the rng); display only. */
  seed?: string;
}

export interface ResolvedVariant<TConfig extends VariantParameters> {
  variant: CaptchaVariant<TConfig>;
  difficulty: CaptchaDifficulty;
  config: TConfig;
  challengeConfig: ChallengeConfig;
}

export const supportedDifficulties = (variant: CaptchaVariant): CaptchaDifficulty[] =>
  DIFFICULTIES.filter((d) => variant.difficulties[d] !== undefined);

/** Looks up a variant and level. Throws RangeError for an unknown variant or an unsupported level. */
export function resolveVariant<TConfig extends VariantParameters>(
  set: CaptchaVariantSet<TConfig>,
  requested: { variantId?: string | undefined; difficulty?: CaptchaDifficulty | undefined } = {},
): ResolvedVariant<TConfig> {
  const variantId = requested.variantId ?? set.defaultSelection.variantId;
  const difficulty = requested.difficulty ?? (requested.variantId === undefined ? set.defaultSelection.difficulty : "medium");
  const variant = set.variants.find((v) => v.id === variantId);
  if (!variant) throw new RangeError(`Unknown variant "${variantId}"`);
  const config = variant.difficulties[difficulty];
  if (!config) throw new RangeError(`Variant "${variantId}" has no "${difficulty}" level`);
  return { variant, difficulty, config, challengeConfig: { variantId, difficulty, parameters: config } };
}

/** Throws RangeError when `value` is not a finite number in [min, max]. For config validation in generators. */
export function assertRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max} (got ${value})`);
  }
}
