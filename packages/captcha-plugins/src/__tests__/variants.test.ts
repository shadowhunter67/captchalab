import { describe, expect, it } from "vitest";
import { DIFFICULTIES, createRng, supportedDifficulties, type CaptchaDifficulty } from "@captchalab/captcha-core";
import {
  VARIANT_SETS,
  expectedSelection,
  generateCheckboxChallenge,
  generateDragDropChallenge,
  generateImageGridChallenge,
  generateMathChallenge,
  generateAudioChallenge,
  generateMemoryChallenge,
  generatePowChallenge,
  generateRotationChallenge,
  generateSequenceChallenge,
  generateShapeMatchingChallenge,
  generateSliderChallenge,
  generateTextChallenge,
  verifyCheckboxAnswer,
  verifyImageGridAnswer,
  verifyRotationAnswer,
  verifySliderAnswer,
  verifyTextAnswer,
} from "../index";

type Gen = (ctx: { rng: () => number; variantId?: string; difficulty?: CaptchaDifficulty }) => { config?: { variantId: string; difficulty: string; parameters: Record<string, unknown> } };

const generators: Record<keyof typeof VARIANT_SETS, Gen> = {
  slider: generateSliderChallenge,
  checkbox: generateCheckboxChallenge,
  "drag-drop": generateDragDropChallenge,
  rotation: generateRotationChallenge,
  text: generateTextChallenge,
  "image-grid": generateImageGridChallenge,
  "shape-matching": generateShapeMatchingChallenge,
  "math-logic": generateMathChallenge,
  sequence: generateSequenceChallenge,
  memory: generateMemoryChallenge,
  "proof-of-work": generatePowChallenge,
  audio: generateAudioChallenge,
};

describe("every variant set", () => {
  for (const [id, set] of Object.entries(VARIANT_SETS)) {
    const gen = generators[id as keyof typeof VARIANT_SETS];
    it(`${id}: default selection exists, ids are unique, every level generates and records its config`, () => {
      const ids = set.variants.map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
      const def = set.variants.find((v) => v.id === set.defaultSelection.variantId);
      expect(def?.difficulties[set.defaultSelection.difficulty]).toBeDefined();
      for (const v of set.variants) {
        expect(v.name.length).toBeGreaterThan(0);
        expect(supportedDifficulties(v).length).toBeGreaterThan(0);
        for (const d of supportedDifficulties(v)) {
          const c = gen({ rng: createRng(3), variantId: v.id, difficulty: d });
          expect(c.config).toMatchObject({ variantId: v.id, difficulty: d });
          expect(c.config?.parameters).toMatchObject(v.difficulties[d]!); // a generator may add what it actually chose
        }
      }
    });
    it(`${id}: same seed + variant + difficulty gives the same challenge`, () => {
      for (const v of set.variants) {
        const d = supportedDifficulties(v)[0]!;
        expect(gen({ rng: createRng(9), variantId: v.id, difficulty: d })).toEqual(gen({ rng: createRng(9), variantId: v.id, difficulty: d }));
      }
    });
    it(`${id}: an unknown variant or an unsupported level throws`, () => {
      expect(() => gen({ rng: createRng(1), variantId: "nope" })).toThrow(RangeError);
    });
    it(`${id}: the plain call still gives the default challenge`, () => {
      const plain = gen({ rng: createRng(5) });
      expect(plain.config).toMatchObject(set.defaultSelection);
    });
  }
});

describe("difficulty really changes the challenge", () => {
  const at = <T,>(g: (c: { rng: () => number; variantId: string; difficulty: CaptchaDifficulty }) => T, variantId: string, d: CaptchaDifficulty) =>
    g({ rng: createRng(4), variantId, difficulty: d });

  it("slider: tolerance shrinks easy > medium > hard in both variants", () => {
    for (const v of ["classic", "precision"]) {
      const [e, m, h] = DIFFICULTIES.map((d) => at(generateSliderChallenge, v, d).tolerance);
      expect(e).toBeGreaterThan(m!);
      expect(m).toBeGreaterThan(h!);
    }
  });
  it("slider: keyboard steps (0.01) can still land inside the narrowest window", () => {
    for (const v of VARIANT_SETS.slider.variants) expect(v.difficulties.hard!.tolerance).toBeGreaterThanOrEqual(0.01);
  });
  it("rotation: classic tolerance shrinks; offset-start moves the start further out and keeps it away from upright", () => {
    const tol = DIFFICULTIES.map((d) => at(generateRotationChallenge, "classic", d).tolerance);
    expect(tol[0]).toBeGreaterThan(tol[1]!);
    expect(tol[1]).toBeGreaterThan(tol[2]!);
    const dist = (a: number) => Math.min(a, 360 - a);
    for (let seed = 0; seed < 40; seed++) {
      const lo = generateRotationChallenge({ rng: createRng(seed), variantId: "offset-start", difficulty: "easy" }).initialAngle;
      const hi = generateRotationChallenge({ rng: createRng(seed), variantId: "offset-start", difficulty: "hard" }).initialAngle;
      expect(dist(lo)).toBeGreaterThanOrEqual(40);
      expect(dist(lo)).toBeLessThanOrEqual(90);
      expect(dist(hi)).toBeGreaterThanOrEqual(140);
      expect(dist(hi)).toBeLessThanOrEqual(180);
    }
  });
  it("drag-drop: items and drop areas shrink with difficulty", () => {
    const [e, m, h] = DIFFICULTIES.map((d) => at(generateDragDropChallenge, "shape-match", d));
    expect(e!.dropTolerance).toBeGreaterThan(m!.dropTolerance);
    expect(m!.dropTolerance).toBeGreaterThan(h!.dropTolerance);
    expect(e!.itemSize).toBeGreaterThan(h!.itemSize);
  });
  it("text: length, rotation and noise follow the preset", () => {
    for (const v of VARIANT_SETS.text.variants) {
      for (const d of DIFFICULTIES) {
        const p = v.difficulties[d]!;
        const c = at(generateTextChallenge, v.id, d);
        expect(c.text).toHaveLength(p.length);
        expect(c.noise).toHaveLength(p.noiseLines);
        for (const g of c.glyphs) expect(Math.abs(g.rotate)).toBeLessThanOrEqual(p.rotationDeg);
      }
    }
    expect(at(generateTextChallenge, "noisy", "hard").noise.length).toBeGreaterThan(at(generateTextChallenge, "clean", "hard").noise.length);
  });
  it("image grid: matching-cell count stays in the preset range; the similar family only uses its shapes", () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const d of DIFFICULTIES) {
        for (const v of VARIANT_SETS["image-grid"].variants) {
          const p = v.difficulties[d]!;
          const c = generateImageGridChallenge({ rng: createRng(seed), variantId: v.id, difficulty: d });
          const n = expectedSelection(c).length;
          expect(n).toBeGreaterThanOrEqual(p.targetMin);
          expect(n).toBeLessThanOrEqual(p.targetMax);
          if (v.id === "similar-shapes") for (const cell of c.cells) expect(["circle", "oval", "square", "rounded"]).toContain(cell.shape);
        }
      }
    }
  });
  it("checkbox: supports exactly one level", () => {
    expect(supportedDifficulties(VARIANT_SETS.checkbox.variants[0]!)).toEqual(["medium"]);
    expect(() => generateCheckboxChallenge({ rng: createRng(1), difficulty: "hard" })).toThrow(RangeError);
  });
});

describe("verification does not depend on variant or difficulty", () => {
  it("each generated challenge is solvable by its own correct answer", () => {
    for (const d of DIFFICULTIES) {
      const s = generateSliderChallenge({ rng: createRng(2), variantId: "precision", difficulty: d });
      expect(verifySliderAnswer(s, { position: s.target }).passed).toBe(true);
      const r = generateRotationChallenge({ rng: createRng(2), variantId: "offset-start", difficulty: d });
      expect(verifyRotationAnswer(r, { angle: 0 }).passed).toBe(true);
      const t = generateTextChallenge({ rng: createRng(2), variantId: "noisy", difficulty: d });
      expect(verifyTextAnswer(t, { text: t.text }).passed).toBe(true);
      const g = generateImageGridChallenge({ rng: createRng(2), variantId: "similar-shapes", difficulty: d });
      expect(verifyImageGridAnswer(g, { selected: expectedSelection(g) }).passed).toBe(true);
    }
    const c = generateCheckboxChallenge({ rng: createRng(2) });
    expect(verifyCheckboxAnswer(c, { checked: true }).passed).toBe(true);
  });
});
