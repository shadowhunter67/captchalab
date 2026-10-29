import { describe, expect, it } from "vitest";
import { BALANCE_THRESHOLD, classify, type ClassificationLabel } from "@/lib/behavior/classifier";
import type { GroundTruthLabel } from "@/lib/dataset/records";
import { DEFAULT_THRESHOLDS, MIN_GROUP_SAMPLE, errorKind, evaluate, evaluateBy, readOutput, withThresholds, type EvalInput } from "../evaluate";

let n = 0;
const rec = (label: GroundTruthLabel, output: ClassificationLabel, extra: Partial<EvalInput> = {}): EvalInput => ({
  id: `r${n++}`,
  label,
  captcha: "slider",
  variant: "v",
  difficulty: "medium",
  balance: output === "human-like" ? -0.5 : output === "synthetic-like" ? 0.5 : 0,
  output,
  ...extra,
});
const many = (k: number, label: GroundTruthLabel, output: ClassificationLabel): EvalInput[] => Array.from({ length: k }, () => rec(label, output));

// 3 HH, 1 HS, 1 HU, 1 SH, 3 SS, 1 SU, 2 unknown  -> eligible 10, decided 8
const FIXTURE: EvalInput[] = [
  ...many(3, "human", "human-like"),
  ...many(1, "human", "synthetic-like"),
  ...many(1, "human", "uncertain"),
  ...many(1, "synthetic", "human-like"),
  ...many(3, "synthetic", "synthetic-like"),
  ...many(1, "synthetic", "uncertain"),
  ...many(2, "unknown", "human-like"),
];

describe("evaluate: denominators", () => {
  const e = evaluate(FIXTURE);
  it("excludes unknown and says so", () => {
    expect(e.total).toBe(12);
    expect(e.excludedUnknown).toBe(2);
    expect(e.eligible).toBe(10);
  });
  it("fills the matrix from labelled records only", () => {
    expect(e.matrix.human).toEqual({ humanLike: 3, syntheticLike: 1, uncertain: 1 });
    expect(e.matrix.synthetic).toEqual({ humanLike: 1, syntheticLike: 3, uncertain: 1 });
  });
  it("coverage and abstention use eligible; accuracy uses decided", () => {
    expect(e.decided).toBe(8);
    expect(e.metrics.coverage).toBeCloseTo(0.8, 12);
    expect(e.metrics.abstentionRate).toBeCloseTo(0.2, 12);
    expect(e.metrics.decidedAccuracy).toBeCloseTo(0.75, 12); // 6 / 8
    expect(e.metrics.overallCorrectRate).toBeCloseTo(0.6, 12); // 6 / 10, uncertain not correct
  });
  it("precision / recall / F1 with Synthetic positive, decided only", () => {
    expect(e.metrics.precision).toBeCloseTo(0.75, 12); // 3 / (3 + 1)
    expect(e.metrics.recall).toBeCloseTo(0.75, 12); // 3 / (3 + 1)
    expect(e.metrics.f1).toBeCloseTo(0.75, 12);
  });
  it("counts the error directions and uncertain separately", () => {
    expect(e.humanAsSynthetic).toBe(1);
    expect(e.syntheticAsHuman).toBe(1);
    expect(e.humanUncertain).toBe(1);
    expect(e.syntheticUncertain).toBe(1);
  });
  it("asymmetric fixture: F1 is the harmonic mean", () => {
    const x = evaluate([...many(2, "synthetic", "synthetic-like"), ...many(2, "human", "synthetic-like"), ...many(1, "synthetic", "human-like")]);
    expect(x.metrics.precision).toBeCloseTo(0.5, 12); // 2 / 4
    expect(x.metrics.recall).toBeCloseTo(2 / 3, 12); // 2 / 3
    expect(x.metrics.f1).toBeCloseTo(4 / 7, 12); // 2 * 0.5 * (2/3) / (0.5 + 2/3)
  });
});

describe("evaluate: empty and degenerate input", () => {
  it("no records: zeros and null ratios, never NaN", () => {
    const e = evaluate([]);
    expect(e.eligible).toBe(0);
    expect(Object.values(e.metrics).every((v) => v === null)).toBe(true);
  });
  it("only unknown: nothing eligible", () => {
    const e = evaluate(many(3, "unknown", "human-like"));
    expect(e.eligible).toBe(0);
    expect(e.excludedUnknown).toBe(3);
    expect(e.metrics.coverage).toBeNull();
  });
  it("all uncertain: coverage 0, accuracy null (nothing decided)", () => {
    const e = evaluate([...many(2, "human", "uncertain"), ...many(2, "synthetic", "uncertain")]);
    expect(e.metrics.coverage).toBe(0);
    expect(e.metrics.abstentionRate).toBe(1);
    expect(e.metrics.decidedAccuracy).toBeNull();
    expect(e.metrics.f1).toBeNull();
  });
  it("no synthetic read as synthetic: precision null, recall 0, F1 null", () => {
    const e = evaluate([...many(2, "human", "human-like"), ...many(2, "synthetic", "human-like")]);
    expect(e.metrics.precision).toBeNull();
    expect(e.metrics.recall).toBe(0);
    expect(e.metrics.f1).toBeNull();
  });
});

describe("evaluateBy: sparse groups", () => {
  const rows = [...many(MIN_GROUP_SAMPLE, "human", "human-like"), ...many(MIN_GROUP_SAMPLE - 1, "synthetic", "synthetic-like").map((r) => ({ ...r, captcha: "text" }))];
  const groups = evaluateBy(rows, (r) => r.captcha);
  it("gates groups below the minimum sample", () => {
    expect(groups.find((g) => g.key === "slider")?.insufficient).toBe(false);
    expect(groups.find((g) => g.key === "text")?.insufficient).toBe(true);
  });
  it("leaves unknown records out of every group", () => {
    expect(evaluateBy(many(9, "unknown", "human-like"), (r) => r.captcha)).toEqual([]);
  });
});

describe("thresholds", () => {
  it("default thresholds read a balance exactly as the classifier does", () => {
    expect(DEFAULT_THRESHOLDS.human).toBe(BALANCE_THRESHOLD);
    for (const b of [-1, -0.2, -0.19, 0, 0.19, 0.2, 1]) {
      const label = readOutput(b, DEFAULT_THRESHOLDS);
      expect(label).toBe(b <= -BALANCE_THRESHOLD ? "human-like" : b >= BALANCE_THRESHOLD ? "synthetic-like" : "uncertain");
    }
    expect(classify).toBeTypeOf("function");
  });
  it("a null balance is uncertain whatever the thresholds", () => {
    expect(readOutput(null, { human: 0, synthetic: 0 })).toBe("uncertain");
  });
  it("changing thresholds changes the copy, not the input or the defaults", () => {
    const input = [rec("human", "uncertain", { balance: -0.3 })];
    const snapshot = JSON.stringify(input);
    const loose = withThresholds(input, { human: 0.1, synthetic: 0.1 });
    expect(loose[0]?.output).toBe("human-like");
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(DEFAULT_THRESHOLDS).toEqual({ human: BALANCE_THRESHOLD, synthetic: BALANCE_THRESHOLD });
    expect(Object.isFrozen(DEFAULT_THRESHOLDS)).toBe(true);
  });
});

describe("errorKind", () => {
  it("names each disagreement and ignores unknown and correct reads", () => {
    expect(errorKind({ label: "human", output: "synthetic-like" })).toBe("human-as-synthetic");
    expect(errorKind({ label: "synthetic", output: "human-like" })).toBe("synthetic-as-human");
    expect(errorKind({ label: "human", output: "uncertain" })).toBe("human-uncertain");
    expect(errorKind({ label: "synthetic", output: "uncertain" })).toBe("synthetic-uncertain");
    expect(errorKind({ label: "human", output: "human-like" })).toBeNull();
    expect(errorKind({ label: "unknown", output: "synthetic-like" })).toBeNull();
  });
});
