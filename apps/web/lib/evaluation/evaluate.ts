import { BALANCE_THRESHOLD, type ClassificationLabel } from "@/lib/behavior/classifier";
import type { GroundTruthLabel } from "@/lib/dataset/records";

/**
 * Evaluation of a classifier against labels a PERSON gave. It only reads: a record's label and the classifier's output
 * (or balance). Nothing here changes a rule, a label or a classifier, and `unknown` never takes part.
 *
 * The classifier may abstain ("uncertain"). Uncertain is therefore its own column: it is not counted right or wrong,
 * and every ratio says which denominator it uses.
 */

export interface EvalInput {
  id: string;
  /** The label a person gave. */
  label: GroundTruthLabel;
  captcha: string;
  variant: string;
  difficulty: string;
  /** The classifier's balance (-1 human-like .. +1 synthetic-like); null when too little was measurable. */
  balance: number | null;
  /** The classifier's own output at its configured thresholds. */
  output: ClassificationLabel;
}

/** Sandbox thresholds on the balance. Human-like when balance <= -human, synthetic-like when balance >= synthetic. */
export interface Thresholds {
  human: number;
  synthetic: number;
}

/** The thresholds of behavioral-baseline@1. Constant; the sandbox only ever passes copies. */
export const DEFAULT_THRESHOLDS: Readonly<Thresholds> = Object.freeze({ human: BALANCE_THRESHOLD, synthetic: BALANCE_THRESHOLD });

/** A group needs at least this many eligible records before a ratio is shown for it. */
export const MIN_GROUP_SAMPLE = 5;

/** The output a balance gives at the given thresholds. A null balance (insufficient data) is always uncertain. */
export function readOutput(balance: number | null, t: Thresholds): ClassificationLabel {
  if (balance === null || !Number.isFinite(balance)) return "uncertain";
  if (balance <= -t.human) return "human-like";
  if (balance >= t.synthetic) return "synthetic-like";
  return "uncertain";
}

/** Re-reads every record's output at the given thresholds (a copy; the inputs are not touched). */
export function withThresholds(inputs: readonly EvalInput[], t: Thresholds): EvalInput[] {
  return inputs.map((r) => ({ ...r, output: readOutput(r.balance, t) }));
}

export type OutputKey = "humanLike" | "syntheticLike" | "uncertain";
export type ConfusionRow = Readonly<Record<OutputKey, number>>;

const OUTPUT_KEY: Record<ClassificationLabel, OutputKey> = { "human-like": "humanLike", "synthetic-like": "syntheticLike", uncertain: "uncertain" };

export interface EvaluationMetrics {
  /** (human-like + synthetic-like) / eligible. */
  coverage: number | null;
  /** uncertain / eligible. */
  abstentionRate: number | null;
  /** Correct decided / decided. Uncertain is outside this denominator. */
  decidedAccuracy: number | null;
  /** Correct decided / eligible. Uncertain counts as not correct here. */
  overallCorrectRate: number | null;
  /** Positive class = Synthetic, on decided samples only. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface Evaluation {
  /** Every record given. */
  total: number;
  /** Labelled human or synthetic. */
  eligible: number;
  excludedUnknown: number;
  /** Rows = the label a person gave; columns = what the classifier said. */
  matrix: Readonly<{ human: ConfusionRow; synthetic: ConfusionRow }>;
  decided: number;
  /** Human labelled, read as Synthetic-like ("false rejection-like"). */
  humanAsSynthetic: number;
  /** Synthetic labelled, read as Human-like ("false acceptance-like"). */
  syntheticAsHuman: number;
  humanUncertain: number;
  syntheticUncertain: number;
  metrics: EvaluationMetrics;
}

const ratio = (n: number, d: number): number | null => (d > 0 ? n / d : null);

export function evaluate(inputs: readonly EvalInput[]): Evaluation {
  const human: Record<OutputKey, number> = { humanLike: 0, syntheticLike: 0, uncertain: 0 };
  const synthetic: Record<OutputKey, number> = { humanLike: 0, syntheticLike: 0, uncertain: 0 };
  let excludedUnknown = 0;
  for (const r of inputs) {
    if (r.label === "unknown") excludedUnknown++;
    else (r.label === "human" ? human : synthetic)[OUTPUT_KEY[r.output]]++;
  }
  const eligible = inputs.length - excludedUnknown;
  const uncertain = human.uncertain + synthetic.uncertain;
  const decided = eligible - uncertain;
  const correct = human.humanLike + synthetic.syntheticLike;
  const tp = synthetic.syntheticLike;
  const fp = human.syntheticLike;
  const fn = synthetic.humanLike;
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  return {
    total: inputs.length,
    eligible,
    excludedUnknown,
    matrix: { human, synthetic },
    decided,
    humanAsSynthetic: fp,
    syntheticAsHuman: fn,
    humanUncertain: human.uncertain,
    syntheticUncertain: synthetic.uncertain,
    metrics: {
      coverage: ratio(decided, eligible),
      abstentionRate: ratio(uncertain, eligible),
      decidedAccuracy: ratio(correct, decided),
      overallCorrectRate: ratio(correct, eligible),
      precision,
      recall,
      f1,
    },
  };
}

export interface GroupEvaluation {
  key: string;
  evaluation: Evaluation;
  /** Fewer than MIN_GROUP_SAMPLE eligible records: counts are shown, ratios are not. */
  insufficient: boolean;
}

/** Evaluation per group (CAPTCHA, variant, difficulty ...). Groups with no eligible record are left out. */
export function evaluateBy(inputs: readonly EvalInput[], keyOf: (r: EvalInput) => string): GroupEvaluation[] {
  const groups = new Map<string, EvalInput[]>();
  for (const r of inputs) {
    if (r.label === "unknown") continue;
    const k = keyOf(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.entries()]
    .map(([key, rs]) => {
      const evaluation = evaluate(rs);
      return { key, evaluation, insufficient: evaluation.eligible < MIN_GROUP_SAMPLE };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export type ErrorKind = "human-as-synthetic" | "synthetic-as-human" | "human-uncertain" | "synthetic-uncertain";

/** The kind of disagreement a record shows, or null when it is unknown or the classifier decided correctly. */
export function errorKind(r: Pick<EvalInput, "label" | "output">): ErrorKind | null {
  if (r.label === "unknown") return null;
  if (r.output === "uncertain") return r.label === "human" ? "human-uncertain" : "synthetic-uncertain";
  if (r.label === "human" && r.output === "synthetic-like") return "human-as-synthetic";
  if (r.label === "synthetic" && r.output === "human-like") return "synthetic-as-human";
  return null;
}
