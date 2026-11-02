import { describe, expect, it } from "vitest";
import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import { ART_CATEGORIES, ART_SCENES_FOR, generateSliderChallenge, verifySliderAnswer } from "../../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty = "medium") => generateSliderChallenge({ rng: createRng(seed), variantId, difficulty });

describe("slider puzzle variant", () => {
  it("is deterministic, and its picture is a valid category, scene and place", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 80; seed++) {
        const c = gen(seed, "puzzle", d);
        expect(c).toEqual(gen(seed, "puzzle", d));
        const p = c.puzzle!;
        expect(ART_CATEGORIES).toContain(p.category);
        expect(ART_SCENES_FOR[p.category]).toContain(p.scene);
        expect(Number.isInteger(p.seed) && p.seed >= 0).toBe(true);
        expect(p.y).toBeGreaterThanOrEqual(0.22);
        expect(p.y).toBeLessThanOrEqual(0.6);
        expect(c.tolerance).toBeGreaterThanOrEqual(0.01); // a keyboard step (0.01) can always land inside the window
      }
    }
  });

  it("the gap is the verifier's own target: the window is exactly target +- tolerance", () => {
    const c = gen(9, "puzzle", "hard");
    expect(verifySliderAnswer(c, { position: c.target }).passed).toBe(true);
    expect(verifySliderAnswer(c, { position: Math.min(1, c.target + c.tolerance + 0.01) }).passed).toBe(false);
    expect(verifySliderAnswer(c, { position: Math.max(0, c.target - c.tolerance - 0.01) }).passed).toBe(false);
  });

  it("classic and precision are untouched: same target, no picture", () => {
    for (const v of ["classic", "precision"]) {
      const c = gen(12345, v);
      expect(c.puzzle).toBeUndefined();
    }
    // The first rng draws are shared, so the target of a seed is the same in every variant.
    expect(gen(12345, "classic").target).toBe(gen(12345, "puzzle").target);
  });
});
