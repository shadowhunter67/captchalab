import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import type { GridShape } from "../image-grid/types";
import { isUnambiguous, isVisualUnambiguous } from "./rules";
import type { NumberRule, SequenceChallenge, SequenceNumberChallenge, SequenceOption, SequenceVisualChallenge } from "./types";
import { SEQUENCE_VARIANTS, type SequenceVariantConfig } from "./variants";

type Rng = () => number;
const int = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const MAX_TRIES = 400;

function shuffled<T>(values: readonly T[], rng: Rng): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function numberSequence(rule: NumberRule, length: number, rng: Rng): number[] {
  const out: number[] = [];
  if (rule === "arithmetic") {
    const start = int(rng, 1, 10);
    const step = int(rng, 2, 7);
    for (let k = 0; k < length; k++) out.push(start + k * step);
  } else if (rule === "geometric") {
    const start = int(rng, 1, 4);
    const ratio = int(rng, 2, 3);
    for (let k = 0; k < length; k++) out.push(start * ratio ** k);
  } else if (rule === "alternating") {
    const start = int(rng, 1, 10);
    const a = int(rng, 1, 9);
    let b = int(rng, 1, 9);
    if (b === a) b = (b % 9) + 1;
    for (let k = 0; k < length; k++) out.push(start + Math.ceil(k / 2) * a + Math.floor(k / 2) * b);
  } else {
    const s1 = int(rng, 1, 10);
    const d1 = int(rng, 2, 6);
    const s2 = int(rng, 1, 20);
    const d2 = int(rng, 2, 8);
    for (let k = 0; k < length; k++) out.push(k % 2 === 0 ? s1 + (k / 2) * d1 : s2 + ((k - 1) / 2) * d2);
  }
  return out;
}

function pickRule(config: SequenceVariantConfig, rng: Rng): NumberRule {
  const allowed = config.patterns.split(",").map((p) => p.trim());
  const rule = allowed[Math.floor(rng() * allowed.length)];
  if (rule === "arithmetic" || rule === "geometric" || rule === "alternating") return rule;
  if (rule === "two interleaved rules" || rule === "interleaved") return "interleaved";
  throw new RangeError(`Unknown number pattern "${String(rule)}"`);
}

function generateNumber(rng: Rng, config: SequenceVariantConfig, id: string, challengeConfig: NonNullable<SequenceNumberChallenge["config"]>): SequenceNumberChallenge {
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const rule = pickRule(config, rng);
    const values = numberSequence(rule, config.length, rng);
    // The first two terms stay visible; an alternating pattern also needs the third to pin down both steps.
    const minHidden = rule === "alternating" ? 3 : 2;
    const hiddenIndex = int(rng, minHidden, config.length - 1);
    const terms = values.map((v, k) => (k === hiddenIndex ? null : v));
    const expected = values[hiddenIndex] as number;
    if (isUnambiguous(terms, hiddenIndex, rule, expected)) {
      return {
        id, kind: "number", terms, hiddenIndex, expectedAnswer: expected, rule,
        config: { ...challengeConfig, parameters: { ...challengeConfig.parameters, pattern: rule } },
      };
    }
  }
  throw new RangeError("could not build an unambiguous number sequence");
}

const SHAPES: readonly GridShape[] = ["circle", "square", "triangle", "star"];
/** Repeating units by period: the symbols are letters that are later mapped to distinct shapes. */
const UNITS: Readonly<Record<number, readonly string[]>> = { 2: ["AB"], 3: ["ABC"], 4: ["ABCB", "ABAC"] };

function generateVisual(rng: Rng, config: SequenceVariantConfig, id: string, challengeConfig: NonNullable<SequenceVisualChallenge["config"]>): SequenceVisualChallenge {
  const period = Number(config.patterns);
  const units = UNITS[period];
  if (!units) throw new RangeError(`Unsupported pattern length ${config.patterns}`);
  const shapes = shuffled(SHAPES, rng);
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const unit = units[Math.floor(rng() * units.length)] as string;
    const letters = "ABCD";
    const symbolShape = (ch: string): GridShape => shapes[letters.indexOf(ch)] as GridShape;
    const full: GridShape[] = Array.from({ length: config.length }, (_, k) => symbolShape(unit[k % unit.length] as string));
    const hiddenIndex = int(rng, period, config.length - 1);
    const cells = full.map((s, k) => (k === hiddenIndex ? null : s));
    const expected = full[hiddenIndex] as GridShape;
    if (!isVisualUnambiguous(cells, hiddenIndex, period, expected)) continue;
    const used = [...new Set(unit)].map(symbolShape);
    const extra = shapes.filter((s) => !used.includes(s));
    const optionShapes = shuffled([...used, ...extra].slice(0, Math.max(config.options, used.length)), rng);
    const options: SequenceOption[] = optionShapes.map((shape, i) => ({ id: `o${i + 1}`, shape }));
    const expectedOptionId = (options.find((o) => o.shape === expected) as SequenceOption).id;
    return {
      id, kind: "visual", cells, hiddenIndex, options, expectedOptionId, pattern: unit,
      config: { ...challengeConfig, parameters: { ...challengeConfig.parameters, pattern: unit } },
    };
  }
  throw new RangeError("could not build an unambiguous visual sequence");
}

/** Same seed + variant + difficulty, same challenge. Every challenge has exactly one answer (see rules.ts). */
export function generateSequenceChallenge({ rng, variantId, difficulty }: GenerateContext): SequenceChallenge {
  const { variant, config, challengeConfig } = resolveVariant(SEQUENCE_VARIANTS, { variantId, difficulty });
  assertRange("sequence length", config.length, 4, 8);
  assertRange("sequence options", config.options, 0, 4);
  const id = `sequence-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return variant.id === "visual" ? generateVisual(rng, config, id, challengeConfig) : generateNumber(rng, config, id, challengeConfig);
}
