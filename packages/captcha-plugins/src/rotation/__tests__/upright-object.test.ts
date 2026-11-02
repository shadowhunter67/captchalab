import { describe, expect, it } from "vitest";
import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import { ART_UPRIGHT, generateRotationChallenge, verifyRotationAnswer } from "../../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty = "medium") => generateRotationChallenge({ rng: createRng(seed), variantId, difficulty });

describe("rotation upright-object variant", () => {
  it("is deterministic; the subject is an object with an unmistakable top, and never starts upright", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 80; seed++) {
        const c = gen(seed, "upright-object", d);
        expect(c).toEqual(gen(seed, "upright-object", d));
        expect(ART_UPRIGHT).toContain(c.subject!.category);
        expect(Number.isInteger(c.subject!.seed)).toBe(true);
        expect(c.initialAngle).toBeGreaterThanOrEqual(40);
        expect(c.initialAngle).toBeLessThanOrEqual(320);
        expect(c.tolerance).toBeGreaterThanOrEqual(5); // a keyboard step (5 degrees) always reaches the window
      }
    }
  });

  it("the angle rule is unchanged: upright passes, far from upright fails", () => {
    const c = gen(3, "upright-object", "hard");
    expect(verifyRotationAnswer(c, { angle: 0 }).passed).toBe(true);
    expect(verifyRotationAnswer(c, { angle: 360 }).passed).toBe(true);
    expect(verifyRotationAnswer(c, { angle: c.tolerance + 2 }).passed).toBe(false);
    expect(verifyRotationAnswer(c, { angle: 180 }).passed).toBe(false);
  });

  it("the other variants are untouched: no subject, same angle for the same seed", () => {
    expect(gen(7, "classic").subject).toBeUndefined();
    expect(gen(7, "offset-start").subject).toBeUndefined();
    expect(gen(7, "classic").initialAngle).toBe(gen(7, "upright-object").initialAngle);
  });
});
