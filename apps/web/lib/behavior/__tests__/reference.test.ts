import { describe, expect, it } from "vitest";
import { DISTRIBUTION_RUNS, DISTRIBUTION_SIGNALS, summarize, syntheticDistribution } from "../reference";
import { SIGNALS_BY_CAPTCHA } from "../signal-catalog";
import { defaultContext } from "../synthetic";
import { BEHAVIOR_CAPTCHAS, challengeFor } from "./helpers";

describe("summarize", () => {
  it("min, median and max of the finite values; nothing for none", () => {
    expect(summarize("x", [3, 1, 2, null, Number.NaN])).toMatchObject({ values: [3, 1, 2], min: 1, median: 2, max: 3 });
    expect(summarize("x", [4, 1, 3, 2])).toMatchObject({ median: 2.5 });
    expect(summarize("x", [null, null])).toMatchObject({ values: [], min: null, median: null, max: null });
  });
});

describe("syntheticDistribution", () => {
  it("charts only signals the CAPTCHA reports", () => {
    for (const id of BEHAVIOR_CAPTCHAS) for (const s of DISTRIBUTION_SIGNALS[id]) expect(SIGNALS_BY_CAPTCHA[id]).toContain(s);
  });

  it("runs the same challenge many times with consecutive seeds, deterministically", () => {
    const req = { captchaId: "text" as const, profile: "variable-typing", challenge: challengeFor("text"), context: defaultContext("text") };
    const a = syntheticDistribution(req, 10);
    expect(a).toEqual(syntheticDistribution(req, 10));
    expect(a.runs).toBe(DISTRIBUTION_RUNS);
    expect(a.varies).toBe(true);
    const cv = a.signals.find((s) => s.signal === "interKeyCv")!;
    expect(cv.values).toHaveLength(DISTRIBUTION_RUNS);
    expect(cv.max! > cv.min!).toBe(true);
  });

  it("says a no-randomness profile is constant", () => {
    const d = syntheticDistribution({ captchaId: "checkbox", profile: "regular-timing", challenge: challengeFor("checkbox") }, 1);
    expect(d.varies).toBe(false);
    for (const s of d.signals) expect(s.min).toBe(s.max);
  });

  it("works for every CAPTCHA without throwing", () => {
    const profile: Record<string, string> = {
      slider: "noisy",
      "drag-drop": "noisy",
      checkbox: "delayed",
      "image-grid": "variable-interval",
      text: "variable-typing",
      rotation: "overshoot-correct",
      "shape-matching": "variable-interval",
      "math-logic": "variable-typing",
      sequence: "variable-timing",
      memory: "variable-interval",
      audio: "variable-typing",
    };
    for (const id of BEHAVIOR_CAPTCHAS) {
      const d = syntheticDistribution({ captchaId: id, profile: profile[id]!, challenge: challengeFor(id) }, 1, 8);
      expect(d.signals.length).toBe(4);
    }
  });
});
