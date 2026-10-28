import { describe, expect, it } from "vitest";
import { BALANCE_THRESHOLD, CLASSIFIER_VERSION, MIN_EVALUATED, classify, readNormalized } from "../classifier";
import { normalizeRange } from "../normalize";
import { RULES_BY_CAPTCHA } from "../rules";
import { SIGNALS_BY_CAPTCHA } from "../signal-catalog";
import { generateSyntheticSample } from "../synthetic";
import { BEHAVIOR_FEATURE_SET, type BehavioralVector, type LabTaskId } from "../types";
import { BEHAVIOR_CAPTCHAS, challengeFor } from "./helpers";

const vec = (captchaId: LabTaskId, values: Record<string, number | null>): BehavioralVector => ({
  captchaId,
  featureSetVersion: BEHAVIOR_FEATURE_SET,
  sourceSchema: "fixture@1",
  inputModality: "mouse",
  values,
});

/** Hand-made fixtures: every signal clearly at the regular end / clearly at the varied end of its rule. */
const REGULAR: Record<string, Record<string, number>> = {
  slider: { speedCv: 0.01, directionChanges: 0, corrections: 0, overshoot: 0, reactionTime: 100, sampleIntervalCv: 0.003 },
  "drag-drop": { dragDurationCv: 0, sampleIntervalCv: 0.002, speedCv: 0.05, straightness: 1, directionChanges: 0, releaseError: 0.1, failedDropCount: 0, reactionTime: 100 },
  checkbox: { reactionTime: 90, pressDuration: 10, interClickCv: 0 },
  "image-grid": { reactionTime: 90, interClickMean: 60, interClickCv: 0.01, corrections: 0, pauseCount: 0 },
  text: { reactionTime: 90, interKeyCv: 0.01, corrections: 0, pauseCount: 0 },
  rotation: { angularSpeedCv: 0.02, sampleIntervalCv: 0.003, corrections: 0, finalAngularError: 0.05, reactionTime: 90 },
  "shape-matching": { reactionTime: 90, interClickMean: 60, interClickCv: 0.01, corrections: 0, wrongAttempts: 0, pauseCount: 0 },
  "math-logic": { reactionTime: 90, interKeyCv: 0.01, corrections: 0, pauseCount: 0 },
  sequence: { reactionTime: 90, interKeyCv: 0.01, interClickCv: 0.01, corrections: 0, pauseCount: 0 },
  memory: { reactionTime: 90, activationTime: 80, interClickMean: 60, interClickCv: 0.01, corrections: 0, wrongAttempts: 0 },
  audio: { reactionTime: 90, interKeyCv: 0.01, corrections: 0, pauseCount: 0 },
};
const VARIED: Record<string, Record<string, number>> = {
  slider: { speedCv: 0.8, directionChanges: 6, corrections: 3, overshoot: 9, reactionTime: 900, sampleIntervalCv: 0.3 },
  "drag-drop": { dragDurationCv: 0.3, sampleIntervalCv: 0.3, speedCv: 0.7, straightness: 0.8, directionChanges: 8, releaseError: 14, failedDropCount: 2, reactionTime: 1200 },
  checkbox: { reactionTime: 1800, pressDuration: 120, interClickCv: 0.4 },
  "image-grid": { reactionTime: 1500, interClickMean: 1100, interClickCv: 0.4, corrections: 2, pauseCount: 2 },
  text: { reactionTime: 1200, interKeyCv: 0.5, corrections: 2, pauseCount: 1 },
  rotation: { angularSpeedCv: 0.8, sampleIntervalCv: 0.3, corrections: 2, finalAngularError: 5, reactionTime: 1100 },
  "shape-matching": { reactionTime: 1500, interClickMean: 1100, interClickCv: 0.4, corrections: 2, wrongAttempts: 2, pauseCount: 2 },
  "math-logic": { reactionTime: 1600, interKeyCv: 0.5, corrections: 2, pauseCount: 1 },
  sequence: { reactionTime: 1600, interKeyCv: 0.5, interClickCv: 0.5, corrections: 2, pauseCount: 1 },
  memory: { reactionTime: 1500, activationTime: 1800, interClickMean: 1100, interClickCv: 0.4, corrections: 2, wrongAttempts: 2 },
  audio: { reactionTime: 1300, interKeyCv: 0.5, corrections: 2, pauseCount: 1 },
};

describe("classifier configuration", () => {
  it("every rule reads a signal its CAPTCHA reports, once, with a valid range", () => {
    for (const [id, rules] of Object.entries(RULES_BY_CAPTCHA)) {
      const reported = SIGNALS_BY_CAPTCHA[id as LabTaskId];
      const seen = new Set<string>();
      for (const r of rules) {
        expect(reported, `${id}.${r.signal}`).toContain(r.signal);
        expect(seen.has(r.signal)).toBe(false);
        seen.add(r.signal);
        expect(r.hi).toBeGreaterThan(r.lo);
        expect(r.weight).toBeGreaterThanOrEqual(0.5);
        expect(r.weight).toBeLessThanOrEqual(1.5);
      }
      expect(rules.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("each CAPTCHA reads the signals that matter for it (not one universal rule set)", () => {
    const signals = (id: LabTaskId) => RULES_BY_CAPTCHA[id].map((r) => r.signal);
    expect(signals("slider")).toEqual(expect.arrayContaining(["speedCv", "directionChanges", "overshoot", "corrections", "reactionTime"]));
    expect(signals("drag-drop")).toEqual(expect.arrayContaining(["dragDurationCv", "failedDropCount", "straightness"]));
    expect(signals("checkbox")).toEqual(expect.arrayContaining(["reactionTime", "pressDuration"]));
    expect(signals("image-grid")).toEqual(expect.arrayContaining(["interClickCv", "corrections"]));
    expect(signals("text")).toEqual(expect.arrayContaining(["interKeyCv", "corrections", "pauseCount"]));
    expect(signals("rotation")).toEqual(expect.arrayContaining(["angularSpeedCv", "corrections", "finalAngularError"]));
    expect(signals("shape-matching")).toEqual(expect.arrayContaining(["interClickCv", "corrections", "wrongAttempts"]));
    expect(signals("math-logic")).toEqual(expect.arrayContaining(["interKeyCv", "corrections"]));
    expect(signals("sequence")).toEqual(expect.arrayContaining(["interKeyCv", "interClickCv"]));
    expect(signals("memory")).toEqual(expect.arrayContaining(["activationTime", "interClickCv", "wrongAttempts"]));
    expect(signals("audio")).toEqual(expect.arrayContaining(["interKeyCv", "corrections"]));
    // Distinct rule sets, except the two that read exactly the same typing signals (Text and Audio only differ in reaction scale).
    expect(new Set(BEHAVIOR_CAPTCHAS.map((id) => signals(id).join())).size).toBeGreaterThanOrEqual(BEHAVIOR_CAPTCHAS.length - 2);
  });

  it("is versioned", () => {
    expect(CLASSIFIER_VERSION).toBe("behavioral-baseline@1");
    expect(classify(vec("slider", REGULAR["slider"]!)).classifier).toBe(CLASSIFIER_VERSION);
  });
});

describe("normalization", () => {
  it("maps onto 0..1 by the configured range, clamps, and flips for low-is-human", () => {
    expect(normalizeRange(5, 0, 10)).toBe(0.5);
    expect(normalizeRange(-3, 0, 10)).toBe(0);
    expect(normalizeRange(99, 0, 10)).toBe(1);
    expect(normalizeRange(2, 0, 10, true)).toBeCloseTo(0.8);
    expect(normalizeRange(null, 0, 10)).toBeNull();
    expect(normalizeRange(Number.NaN, 0, 10)).toBeNull();
    expect(() => normalizeRange(1, 5, 5)).toThrow(RangeError);
  });
});

describe("evidence reading", () => {
  it("has a neutral middle band and strength grows toward each end", () => {
    expect(readNormalized(0.5, undefined)).toMatchObject({ tendency: "neutral" });
    expect(readNormalized(0.41, undefined)).toMatchObject({ tendency: "neutral" });
    expect(readNormalized(0.59, undefined)).toMatchObject({ tendency: "neutral" });
    expect(readNormalized(0.65, undefined)).toEqual({ tendency: "human-like", strength: "weak" });
    expect(readNormalized(0.8, undefined)).toEqual({ tendency: "human-like", strength: "moderate" });
    expect(readNormalized(1, undefined)).toEqual({ tendency: "human-like", strength: "strong" });
    expect(readNormalized(0.3, undefined)).toEqual({ tendency: "synthetic-like", strength: "weak" });
    expect(readNormalized(0.2, undefined)).toEqual({ tendency: "synthetic-like", strength: "moderate" });
    expect(readNormalized(0, undefined)).toEqual({ tendency: "synthetic-like", strength: "strong" });
  });

  it("a one-sided rule gives no evidence at its low end (none of something proves nothing)", () => {
    expect(readNormalized(0, "human")).toMatchObject({ tendency: "neutral" });
    expect(readNormalized(1, "human")).toEqual({ tendency: "human-like", strength: "strong" });
  });
});

describe.each(BEHAVIOR_CAPTCHAS)("classify %s", (id) => {
  it("a clearly regular fixture is not Human-like", () => {
    const c = classify(vec(id, REGULAR[id]!));
    expect(c.label).toBe("synthetic-like");
    expect(c.balance).toBeGreaterThanOrEqual(BALANCE_THRESHOLD);
  });

  it("a clearly variable fixture is not automatically Synthetic-like", () => {
    const c = classify(vec(id, VARIED[id]!));
    expect(c.label).toBe("human-like");
    expect(c.balance).toBeLessThanOrEqual(-BALANCE_THRESHOLD);
  });

  it("a mixed fixture carries evidence for both sides and its label follows the balance", () => {
    const regular = REGULAR[id]!;
    const varied = VARIED[id]!;
    const keys = Object.keys(regular);
    // Take the first half of the signals from the regular fixture and the rest from the varied one, then fine tune.
    const mixed: Record<string, number> = {};
    keys.forEach((k, i) => (mixed[k] = (i % 2 === 0 ? regular : varied)[k]!));
    const c = classify(vec(id, mixed));
    // Both kinds of evidence are present, so the label is whatever the balance says: it must agree with it.
    expect(c.evidence.some((e) => e.tendency === "human-like")).toBe(true);
    expect(c.evidence.some((e) => e.tendency === "synthetic-like")).toBe(true);
    const expected = (c.balance as number) <= -BALANCE_THRESHOLD ? "human-like" : (c.balance as number) >= BALANCE_THRESHOLD ? "synthetic-like" : "uncertain";
    expect(c.label).toBe(expected);
  });
});

describe("the Uncertain zone is reachable and honest", () => {
  it("a balanced fixture sits inside the threshold band", () => {
    // checkbox: a strong synthetic-like rhythm against a human-like reaction and press.
    const c = classify(vec("checkbox", { reactionTime: 1000, pressDuration: 100, interClickCv: 0 }));
    expect(c.label).toBe("uncertain");
    expect(Math.abs(c.balance as number)).toBeLessThan(BALANCE_THRESHOLD);
  });

  it("too few readable signals is Uncertain, with no balance, whatever they say", () => {
    const one = classify(vec("slider", { speedCv: 0.001 }));
    expect(one).toMatchObject({ label: "uncertain", balance: null, reason: "insufficient-data", evaluated: 1 });
    expect(MIN_EVALUATED).toBe(2);
    const none = classify(vec("text", {}));
    expect(none).toMatchObject({ label: "uncertain", balance: null, evaluated: 0 });
    expect(classify(vec("text", { interKeyCv: null, reactionTime: null })).evaluated).toBe(0);
  });

  it("generated profiles reach all three labels somewhere (so the zone is not a dead branch)", () => {
    const labels = new Set<string>();
    for (const id of BEHAVIOR_CAPTCHAS) {
      for (const profile of ["linear", "eased", "noisy", "direct", "immediate", "regular-timing", "uniform-typing", "overshoot-correct"]) {
        try {
          labels.add(classify(generateSyntheticSample({ captchaId: id, profile, challenge: challengeFor(id, 7), seed: 1 }).vector).label);
        } catch {
          // not a profile of this CAPTCHA
        }
      }
    }
    expect([...labels].sort()).toEqual(["human-like", "synthetic-like", "uncertain"]);
  });
});

describe("evidence is consistent with the result", () => {
  it("the label follows the balance, the balance follows the evidence, and neutral evidence adds nothing", () => {
    const fixtures = [...Object.values(REGULAR).map((v, i) => [BEHAVIOR_CAPTCHAS[i]!, v] as const), ...Object.values(VARIED).map((v, i) => [BEHAVIOR_CAPTCHAS[i]!, v] as const)];
    for (const [id, values] of fixtures) {
      const c = classify(vec(id, values));
      const points = { weak: 1, moderate: 2, strong: 3 };
      let sum = 0;
      let max = 0;
      for (const e of c.evidence) {
        max += 3 * e.weight;
        if (e.tendency === "synthetic-like") sum += points[e.strength] * e.weight;
        if (e.tendency === "human-like") sum -= points[e.strength] * e.weight;
      }
      expect(c.balance).toBeCloseTo(sum / max, 10);
      expect(Math.abs(c.balance as number)).toBeLessThanOrEqual(1);
      if (c.label === "human-like") expect(sum).toBeLessThan(0);
      if (c.label === "synthetic-like") expect(sum).toBeGreaterThan(0);
      for (const e of c.evidence) {
        expect(e.normalized).toBeGreaterThanOrEqual(0);
        expect(e.normalized).toBeLessThanOrEqual(1);
        expect(e.explanation.length).toBeGreaterThan(0);
        expect(e.explanationVi.length).toBeGreaterThan(0);
      }
    }
  });

  it("evidence is ordered strongest first, neutral last", () => {
    const c = classify(vec("slider", { ...REGULAR["slider"]!, speedCv: 0.9 }));
    const rank = (e: { tendency: string; strength: string; weight: number }) => (e.tendency === "neutral" ? 0 : ({ weak: 1, moderate: 2, strong: 3 } as Record<string, number>)[e.strength]! * e.weight);
    for (let i = 1; i < c.evidence.length; i++) expect(rank(c.evidence[i - 1]!)).toBeGreaterThanOrEqual(rank(c.evidence[i]!));
  });

  it("is deterministic and never mutates its input", () => {
    const v = vec("text", { ...VARIED["text"]! });
    const copy = JSON.stringify(v);
    expect(classify(v)).toEqual(classify(v));
    expect(JSON.stringify(v)).toBe(copy);
  });

  it("only ever says one of three labels and never a percentage", () => {
    for (const id of BEHAVIOR_CAPTCHAS) {
      for (const f of [REGULAR[id]!, VARIED[id]!, {}]) {
        const c = classify(vec(id, f));
        expect(["human-like", "synthetic-like", "uncertain"]).toContain(c.label);
        expect(Object.keys(c).sort()).toEqual(expect.arrayContaining(["balance", "classifier", "evaluated", "evidence", "label"]));
        expect(JSON.stringify(c)).not.toMatch(/probab|percent|confidence|"bot"/i);
      }
    }
  });
});
