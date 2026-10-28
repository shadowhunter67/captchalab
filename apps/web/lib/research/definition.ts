import { DIFFICULTIES, isDifficulty, supportedDifficulties, type CaptchaDifficulty, type ChallengeConfig } from "@captchalab/captcha-core";
import { VARIANT_SETS, registry } from "@captchalab/captcha-plugins";
import { CHALLENGE_GENERATORS } from "@/lib/behavior/challenges";
import { BEHAVIOR_CAPTCHAS, isBehaviorCaptcha, type BehaviorCaptchaId } from "@/lib/behavior/types";
import { FormatError, canonicalJson, readInt, readObject, readString, readText, type Rec } from "./safe";

export const CHALLENGE_DEFINITION_FORMAT = "challenge-definition" as const;
export const CHALLENGE_DEFINITION_VERSION = 1 as const;

/**
 * The reproducible identity of a challenge: which CAPTCHA, which variant and difficulty, which seed. The plugin's
 * generator is deterministic, so these four values rebuild the exact same challenge. The builder does not add
 * free-form parameters: a plugin's parameters come from its variant and difficulty presets.
 */
export interface ChallengeDefinition {
  captcha: BehaviorCaptchaId;
  variant: string;
  difficulty: CaptchaDifficulty;
  seed: number;
  /** Descriptive only; never part of what is generated. */
  name?: string;
}

export const MAX_SEED = 0xffffffff;

export interface DefinitionFile {
  format: typeof CHALLENGE_DEFINITION_FORMAT;
  version: typeof CHALLENGE_DEFINITION_VERSION;
  captcha: BehaviorCaptchaId;
  /** Version of the plugin that generated the challenge; a different plugin version may build a different challenge. */
  pluginVersion: string;
  variant: string;
  difficulty: CaptchaDifficulty;
  seed: number;
  /** A readable snapshot of the preset parameters, checked on import against what the plugin generates today. */
  parameters: Readonly<Record<string, string | number | boolean>>;
  name?: string;
}

/** Why a definition cannot be generated, one English sentence each. Empty means valid. */
export function validateDefinition(d: { captcha: string; variant: string; difficulty: string; seed: number }): string[] {
  const errors: string[] = [];
  if (!isBehaviorCaptcha(d.captcha)) {
    errors.push(`CAPTCHA "${d.captcha}" is not supported (use ${BEHAVIOR_CAPTCHAS.join(", ")}).`);
    return errors;
  }
  const set = VARIANT_SETS[d.captcha];
  const variant = set.variants.find((v) => v.id === d.variant);
  if (!variant) errors.push(`Variant "${d.variant}" does not exist for ${d.captcha}.`);
  if (!isDifficulty(d.difficulty)) errors.push(`Difficulty "${d.difficulty}" is not one of ${DIFFICULTIES.join(", ")}.`);
  else if (variant && !supportedDifficulties(variant).includes(d.difficulty)) errors.push(`Variant "${d.variant}" has no "${d.difficulty}" level.`);
  if (!Number.isInteger(d.seed) || d.seed < 0 || d.seed > MAX_SEED) errors.push(`Seed must be a whole number from 0 to ${MAX_SEED}.`);
  return errors;
}

export function assertDefinition(d: { captcha: string; variant: string; difficulty: string; seed: number }): asserts d is ChallengeDefinition {
  const errors = validateDefinition(d);
  if (errors.length > 0) throw new FormatError("invalid", errors.join(" "));
}

/** The exact challenge object for a definition (the plugin's own generator, with the seed stamped on its config). */
export function generateChallenge(def: ChallengeDefinition): unknown {
  assertDefinition(def);
  return CHALLENGE_GENERATORS[def.captcha](def.seed, { variantId: def.variant, difficulty: def.difficulty });
}

export function sameDefinition(a: ChallengeDefinition, b: ChallengeDefinition): boolean {
  return a.captcha === b.captcha && a.variant === b.variant && a.difficulty === b.difficulty && a.seed === b.seed;
}

function flatParameters(config: ChallengeConfig | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(config?.parameters ?? {})) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

export function pluginVersionOf(captcha: BehaviorCaptchaId): string {
  return registry.get(captcha).version;
}

export function toDefinitionFile(def: ChallengeDefinition): DefinitionFile {
  const challenge = generateChallenge(def) as { config?: ChallengeConfig };
  return {
    format: CHALLENGE_DEFINITION_FORMAT,
    version: CHALLENGE_DEFINITION_VERSION,
    captcha: def.captcha,
    pluginVersion: pluginVersionOf(def.captcha),
    variant: def.variant,
    difficulty: def.difficulty,
    seed: def.seed,
    parameters: flatParameters(challenge.config),
    ...(def.name ? { name: def.name } : {}),
  };
}

/** Strictly reads an untrusted challenge-definition object and checks it still reproduces today's challenge. */
export function readDefinitionFile(v: unknown, path = "challenge"): ChallengeDefinition {
  const o: Rec = readObject(v, path, ["format", "version", "captcha", "pluginVersion", "variant", "difficulty", "seed", "parameters"], ["name"]);
  if (o["format"] !== CHALLENGE_DEFINITION_FORMAT) throw new FormatError("unsupported-format", `${path}.format must be "${CHALLENGE_DEFINITION_FORMAT}"`);
  if (o["version"] !== CHALLENGE_DEFINITION_VERSION) throw new FormatError("unsupported-version", `${path}.version ${String(o["version"])} (this app reads ${CHALLENGE_DEFINITION_VERSION})`);
  const captcha = readString(o["captcha"], `${path}.captcha`, 32);
  const variant = readString(o["variant"], `${path}.variant`, 64, /^[a-z0-9-]+$/);
  const difficulty = readString(o["difficulty"], `${path}.difficulty`, 16);
  const seed = readInt(o["seed"], `${path}.seed`, 0, MAX_SEED);
  const pluginVersion = readString(o["pluginVersion"], `${path}.pluginVersion`, 32, /^[0-9A-Za-z.+-]+$/);
  const params = readParameters(o["parameters"], `${path}.parameters`);
  const name = o["name"] === undefined ? undefined : readText(o["name"], `${path}.name`, 80);

  const def = { captcha, variant, difficulty, seed };
  const errors = validateDefinition(def);
  if (errors.length > 0) throw new FormatError("invalid", `${path}: ${errors.join(" ")}`);
  const checked = def as ChallengeDefinition;
  if (pluginVersion !== pluginVersionOf(checked.captcha)) {
    throw new FormatError("incompatible", `${path}: made with ${checked.captcha} plugin ${pluginVersion}, this app has ${pluginVersionOf(checked.captcha)}`);
  }
  const regenerated = flatParameters((generateChallenge(checked) as { config?: ChallengeConfig }).config);
  if (canonicalJson(regenerated) !== canonicalJson(params)) {
    throw new FormatError("incompatible", `${path}.parameters do not match what the plugin generates for this variant and difficulty`);
  }
  return name ? { ...checked, name } : checked;
}

function readParameters(v: unknown, path: string): Record<string, string | number | boolean> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new FormatError("invalid", `${path}: expected an object`);
  const out: Record<string, string | number | boolean> = {};
  const keys = Object.keys(v);
  if (keys.length > 32) throw new FormatError("invalid", `${path}: more than 32 entries`);
  for (const k of keys) {
    const x = (v as Record<string, unknown>)[k];
    if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(k)) throw new FormatError("invalid", `${path}: key "${k}" has unexpected characters`);
    if (typeof x === "string") {
      if (x.length > 100) throw new FormatError("invalid", `${path}.${k}: too long`);
      out[k] = x;
    } else if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
    else if (typeof x === "boolean") out[k] = x;
    else throw new FormatError("invalid", `${path}.${k}: expected a string, number or boolean`);
  }
  return out;
}

/**
 * The definition a challenge object was generated from, read back from its own `config` (variant, level and the seed
 * the playground stamped on it). null when the challenge carries no seed or the values are not a valid definition.
 */
export function definitionOfChallenge(captcha: BehaviorCaptchaId, challenge: unknown): ChallengeDefinition | null {
  const config = (challenge as { config?: ChallengeConfig } | null)?.config;
  if (!config || config.seed === undefined) return null;
  const candidate = { captcha, variant: config.variantId, difficulty: config.difficulty, seed: Number(config.seed) };
  return validateDefinition(candidate).length === 0 ? candidate : null;
}
