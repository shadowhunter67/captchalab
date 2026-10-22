import { describe, expect, it } from "vitest";
import { createRng } from "@captchalab/captcha-core";
import { registry, type SliderFeatures } from "@captchalab/captcha-plugins";
import { DEFAULT_SYNTHETIC_LAYOUT, generateSyntheticSliderSession } from "@/lib/synthetic/slider-synthetic";
import { COMPARE_DIMENSIONS, compareRows } from "../compare-data";

const slider = registry.get("slider");
const challenge = slider.generate({ rng: createRng(8) });
const features = (profile: "linear" | "eased" | "noisy"): SliderFeatures =>
  slider.extractFeatures(challenge, generateSyntheticSliderSession({ profile, challenge, seed: 1 }), { layout: DEFAULT_SYNTHETIC_LAYOUT }).features;

describe("compareRows", () => {
  it("has one row per dimension, in order", () => {
    expect(compareRows(null, null).map((r) => r.id)).toEqual(COMPARE_DIMENSIONS.map((d) => d.id));
  });

  it("shows dashes and no difference when a side is missing", () => {
    for (const r of compareRows(null, features("linear"))) {
      expect(r.left).toBe("—");
      expect(r.difference).toBeNull();
    }
  });

  it("computes right minus left with a sign", () => {
    const rows = compareRows(features("linear"), features("noisy"));
    const dist = rows.find((r) => r.id === "distance")!;
    expect(dist.difference).toMatch(/^\+/);
    const same = compareRows(features("linear"), features("linear")).find((r) => r.id === "duration")!;
    expect(same.difference).toMatch(/^±/);
  });

  it("never states a verdict or score", () => {
    const text = JSON.stringify(compareRows(features("linear"), features("noisy"))).toLowerCase();
    for (const w of ["bot", "human-like", "score", "suspicious", "automated"]) expect(text).not.toContain(w);
  });
});
