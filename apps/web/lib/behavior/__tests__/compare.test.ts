import { describe, expect, it } from "vitest";
import { analyzeSession } from "../analysis";
import { signalRows } from "../compare";
import { observationText, observations } from "../observations";
import { SIGNALS_BY_CAPTCHA, formatSignal } from "../signal-catalog";
import { generateSyntheticSample } from "../synthetic";
import { BEHAVIOR_CAPTCHAS, challengeFor } from "./helpers";

const synth = (id: (typeof BEHAVIOR_CAPTCHAS)[number], profile: string, seed = 7) =>
  generateSyntheticSample({ captchaId: id, profile, challenge: challengeFor(id, seed), seed: 1 }).vector;

describe("signalRows", () => {
  it.each(BEHAVIOR_CAPTCHAS)("%s: one row per reported signal, in order", (id) => {
    const rows = signalRows(null, null, id);
    expect(rows.map((r) => r.id)).toEqual(SIGNALS_BY_CAPTCHA[id]);
    for (const r of rows) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it("shows dashes and no difference when a side is missing", () => {
    for (const r of signalRows(null, synth("slider", "linear"), "slider")) {
      expect(r.human).toBe("—");
      expect(r.difference).toBeNull();
    }
  });

  it("computes synthetic minus human with a sign", () => {
    const rows = signalRows(synth("slider", "linear"), synth("slider", "noisy"), "slider");
    expect(rows.find((r) => r.id === "pointerDistance")!.difference).toMatch(/^\+/);
    const same = signalRows(synth("slider", "linear"), synth("slider", "linear"), "slider").find((r) => r.id === "completionTime")!;
    expect(same.difference).toMatch(/^±/);
  });

  it("formats each unit", () => {
    expect(formatSignal("reactionTime", 421)).toBe("421 ms");
    expect(formatSignal("completionTime", 1820)).toBe("1.82 s");
    expect(formatSignal("speedCv", 0.456)).toBe("0.46");
    expect(formatSignal("corrections", 4)).toBe("4");
    expect(formatSignal("corrections", null)).toBe("—");
    expect(formatSignal("overshoot", Number.NaN)).toBe("—");
  });
});

describe("observations", () => {
  it("are descriptive sentences about this pair, in both languages", () => {
    const list = observations(synth("text", "variable-typing"), synth("text", "uniform-typing"));
    expect(list.length).toBeGreaterThan(0);
    const rhythm = list.find((o) => o.signal === "interKeyCv")!;
    expect(rhythm.en).toBe("This synthetic sample has a more uniform typing rhythm than this human sample.");
    expect(rhythm.vi).toContain("Mẫu mô phỏng này");
    expect(observationText(rhythm, (vi) => vi)).toBe(rhythm.vi);
  });

  it("never states a general rule about bots or people", () => {
    const humanProfile: Record<string, string> = {
      slider: "noisy",
      "drag-drop": "noisy",
      checkbox: "delayed",
      "image-grid": "variable-interval",
      text: "correction-typing",
      rotation: "overshoot-correct",
      "shape-matching": "variable-interval",
      "math-logic": "correction-typing",
      sequence: "variable-timing",
      memory: "variable-interval",
      audio: "correction-typing",
    };
    const regularProfile: Record<string, string> = {
      slider: "linear",
      "drag-drop": "direct",
      checkbox: "immediate",
      "image-grid": "uniform-interval",
      text: "uniform-typing",
      rotation: "direct",
      "shape-matching": "uniform-interval",
      "math-logic": "uniform-typing",
      sequence: "uniform-timing",
      memory: "uniform-interval",
      audio: "uniform-typing",
    };
    for (const id of BEHAVIOR_CAPTCHAS) {
      for (const o of observations(synth(id, humanProfile[id]!), synth(id, regularProfile[id]!))) {
        expect(o.en).toMatch(/^This synthetic sample has .+ than this human sample\.$/);
        expect(o.en).not.toMatch(/\b(bots?|always|never|humans? (do|are)|all)\b/i);
      }
    }
  });

  it("says nothing about differences too small to matter, and caps the list", () => {
    const v = synth("slider", "linear");
    expect(observations(v, v)).toEqual([]);
    expect(observations(synth("slider", "linear"), synth("slider", "noisy"), 2).length).toBeLessThanOrEqual(2);
  });

  it("compares the same CAPTCHA only", () => {
    expect(() => observations(synth("slider", "linear"), synth("text", "uniform-typing"))).toThrow(RangeError);
  });

  it("a session analysed again by the same extractors gives the same vector", () => {
    const challenge = challengeFor("checkbox");
    const sample = generateSyntheticSample({ captchaId: "checkbox", profile: "delayed", challenge, seed: 1 });
    expect(analyzeSession("checkbox", challenge, sample.session, undefined)).toEqual(sample.vector);
  });
});
