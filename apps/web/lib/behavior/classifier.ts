import { normalizeRange } from "./normalize";
import { CLASSIFIER_VERSION, RULES_BY_CAPTCHA, type SignalRule } from "./rules";
import type { BehavioralVector } from "./types";

export { CLASSIFIER_VERSION };

export type ClassificationLabel = "human-like" | "synthetic-like" | "uncertain";
export type Tendency = "human-like" | "synthetic-like" | "neutral";
export type Strength = "weak" | "moderate" | "strong";

export interface ClassificationEvidence {
  signal: string;
  tendency: Tendency;
  /** Only meaningful when tendency is not neutral. */
  strength: Strength;
  /** Experimental normalized signal, 0 (synthetic-like end) .. 1 (human-like end) of the CONFIGURED range. */
  normalized: number;
  /** The raw value that was read. */
  value: number;
  /** English sentence; Vietnamese in `explanationVi`. */
  explanation: string;
  explanationVi: string;
  /** Rule weight, for display order and the balance. */
  weight: number;
}

export interface Classification {
  classifier: typeof CLASSIFIER_VERSION;
  label: ClassificationLabel;
  /**
   * Balance of the evidence, -1 (every rule human-like, strongest) .. +1 (every rule synthetic-like, strongest).
   * NOT a probability and not a confidence. null when too little was measurable.
   */
  balance: number | null;
  evidence: ClassificationEvidence[];
  /** How many rules had a value to read. */
  evaluated: number;
  /** Why the label is "uncertain" when it is for lack of data rather than mixed evidence. */
  reason?: "insufficient-data";
}

/** Balance at or below -T reads as human-like, at or above +T as synthetic-like, in between as uncertain. */
export const BALANCE_THRESHOLD = 0.2;
/** A result needs at least this many readable signals; fewer cannot be told apart from chance. */
export const MIN_EVALUATED = 2;

const STRENGTH_POINTS: Record<Strength, number> = { weak: 1, moderate: 2, strong: 3 };

/** Position on the normalized scale -> tendency and strength. The middle band is neutral on purpose. */
export function readNormalized(n: number, oneSided: SignalRule["oneSided"]): { tendency: Tendency; strength: Strength } {
  if (n >= 0.9) return { tendency: "human-like", strength: "strong" };
  if (n >= 0.75) return { tendency: "human-like", strength: "moderate" };
  if (n >= 0.6) return { tendency: "human-like", strength: "weak" };
  if (oneSided === "human" || n > 0.4) return { tendency: "neutral", strength: "weak" };
  if (n > 0.25) return { tendency: "synthetic-like", strength: "weak" };
  if (n > 0.1) return { tendency: "synthetic-like", strength: "moderate" };
  return { tendency: "synthetic-like", strength: "strong" };
}

function evaluate(rule: SignalRule, value: number | null | undefined): ClassificationEvidence | null {
  const n = normalizeRange(value, rule.lo, rule.hi, rule.lowIsHuman ?? false);
  if (n === null || value === null || value === undefined) return null;
  const { tendency, strength } = readNormalized(n, rule.oneSided);
  // Describe the raw level (low or high side of the configured range), whichever way the rule reads it.
  const rawN = rule.lowIsHuman ? 1 - n : n;
  const side = rawN < 0.5 ? rule.low : rule.high;
  return {
    signal: rule.signal,
    tendency,
    strength,
    normalized: n,
    value,
    explanation: side[0],
    explanationVi: side[1],
    weight: rule.weight,
  };
}

/**
 * Experimental rule baseline: per-CAPTCHA signal rules -> evidence -> one balance -> a label with an
 * uncertainty zone. Valid only for CaptchaLab-generated lab samples; it does not show whether a real user is a
 * person or a program, and it makes no probability claim.
 */
export function classify(vector: BehavioralVector): Classification {
  const rules = RULES_BY_CAPTCHA[vector.captchaId];
  const evidence: ClassificationEvidence[] = [];
  for (const rule of rules) {
    const e = evaluate(rule, vector.values[rule.signal]);
    if (e) evidence.push(e);
  }

  const evaluated = evidence.length;
  if (evaluated < MIN_EVALUATED) {
    return { classifier: CLASSIFIER_VERSION, label: "uncertain", balance: null, evidence, evaluated, reason: "insufficient-data" };
  }

  let sum = 0;
  let max = 0;
  for (const e of evidence) {
    max += 3 * e.weight;
    if (e.tendency === "neutral") continue;
    const points = STRENGTH_POINTS[e.strength] * e.weight;
    sum += e.tendency === "synthetic-like" ? points : -points;
  }
  const balance = max > 0 ? sum / max : 0;
  const label: ClassificationLabel = balance <= -BALANCE_THRESHOLD ? "human-like" : balance >= BALANCE_THRESHOLD ? "synthetic-like" : "uncertain";

  // Strongest evidence first; neutral last.
  const order = (e: ClassificationEvidence): number => (e.tendency === "neutral" ? 0 : STRENGTH_POINTS[e.strength] * e.weight);
  evidence.sort((a, b) => order(b) - order(a));
  return { classifier: CLASSIFIER_VERSION, label, balance, evidence, evaluated };
}

export const LABEL_TEXT: Readonly<Record<ClassificationLabel, readonly [string, string]>> = {
  "human-like": ["Human-like", "Giống người"],
  "synthetic-like": ["Synthetic-like", "Giống mô phỏng"],
  uncertain: ["Uncertain", "Chưa rõ"],
};

export const TENDENCY_TEXT: Readonly<Record<Tendency, readonly [string, string]>> = {
  "human-like": ["human-like", "giống người"],
  "synthetic-like": ["synthetic-like", "giống mô phỏng"],
  neutral: ["neutral", "trung tính"],
};

export const STRENGTH_TEXT: Readonly<Record<Strength, readonly [string, string]>> = {
  weak: ["weak", "yếu"],
  moderate: ["moderate", "vừa"],
  strong: ["strong", "mạnh"],
};

/** Text every place that shows a classification must carry. */
export const CLASSIFIER_DISCLAIMER: readonly [string, string] = [
  "Experimental classification for CaptchaLab lab data only. This result does not prove whether a real user is human or automated.",
  "Phân loại thử nghiệm chỉ dành cho dữ liệu thí nghiệm của CaptchaLab. Kết quả này không chứng minh người dùng thật là người hay là chương trình tự động.",
];
