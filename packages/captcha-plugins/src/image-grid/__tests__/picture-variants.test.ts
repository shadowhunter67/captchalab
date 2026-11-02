import { describe, expect, it } from "vitest";
import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import {
  ART_CATEGORIES,
  artGroupOf,
  expectedSelection,
  generateImageGridChallenge,
  verifyImageGridAnswer,
  type ImageGridChallenge,
} from "../../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty) => generateImageGridChallenge({ rng: createRng(seed), variantId, difficulty });
const PICTURE = ["photo-categories", "scene-objects"] as const;
const LEVELS: readonly CaptchaDifficulty[] = ["easy", "medium", "hard"];

describe("picture variants: determinism and a single right answer", () => {
  it("the same seed, variant and difficulty give the same grid, pictures included", () => {
    for (const v of PICTURE) for (const d of LEVELS) for (let seed = 0; seed < 25; seed++) expect(gen(seed, v, d)).toEqual(gen(seed, v, d));
  });

  it("every grid has the required number of positives and exactly one correct set", () => {
    for (const v of PICTURE) {
      for (const d of LEVELS) {
        for (let seed = 0; seed < 60; seed++) {
          const c = gen(seed, v, d);
          const params = c.config!.parameters as { targetMin: number; targetMax: number };
          const expected = expectedSelection(c);
          expect(expected.length, `${v} ${d} ${seed}`).toBeGreaterThanOrEqual(params.targetMin);
          expect(expected.length).toBeLessThanOrEqual(params.targetMax);
          expect(c.cells).toHaveLength(9);
          for (const cell of c.cells) {
            expect(typeof cell.art).toBe("number");
            const shows = cell.shape === c.target;
            // A tile that is not an answer must not show the target anywhere, background included.
            if (!shows) expect(cell.extras ?? [], `${v} ${d} ${seed} ${cell.id}`).not.toContain(c.target);
            if (v === "photo-categories") expect(cell.extras).toBeUndefined();
            expect(cell.extras?.length ?? 0).toBeLessThanOrEqual(2);
          }
          expect(verifyImageGridAnswer(c, { selected: expected }).passed).toBe(true);
        }
      }
    }
  });

  it("the target is any of the catalog categories over many seeds, and a wrong or partial selection fails", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const c = gen(seed, "photo-categories", "medium");
      seen.add(c.target);
      const good = expectedSelection(c);
      expect(verifyImageGridAnswer(c, { selected: good.slice(1) }).passed).toBe(false);
      const wrong = c.cells.find((x) => x.shape !== c.target)!.id;
      expect(verifyImageGridAnswer(c, { selected: [...good, wrong] }).passed).toBe(false);
    }
    expect(seen.size).toBe(ART_CATEGORIES.length);
  });

  it("hard draws most distractors from the target's own group; easy draws none", () => {
    let hardNear = 0;
    let hardTotal = 0;
    for (let seed = 0; seed < 80; seed++) {
      const easy = gen(seed, "photo-categories", "easy");
      const easyGroup = artGroupOf(easy.target as (typeof ART_CATEGORIES)[number]);
      expect(easy.cells.filter((c) => c.shape !== easy.target && easyGroup.includes(c.shape as (typeof ART_CATEGORIES)[number]))).toEqual([]);
      const hard = gen(seed, "photo-categories", "hard");
      const group = artGroupOf(hard.target as (typeof ART_CATEGORIES)[number]);
      for (const cell of hard.cells) {
        if (cell.shape === hard.target) continue;
        hardTotal++;
        if (group.includes(cell.shape as (typeof ART_CATEGORIES)[number])) hardNear++;
      }
    }
    expect(hardNear / hardTotal).toBeGreaterThan(0.6);
  });

  it("the legacy shape variants still draw exactly the grids they always did (no picture fields)", () => {
    for (const v of ["basic-shapes", "similar-shapes"]) {
      const c = gen(5, v, "medium");
      expect(c.cells.every((cell) => cell.art === undefined && cell.extras === undefined)).toBe(true);
    }
  });
});

describe("verifier: an ambiguous or malformed picture grid is refused", () => {
  const base = gen(3, "scene-objects", "medium");
  it("a tile that is not an answer but shows the target in the background makes the grid invalid", () => {
    const i = base.cells.findIndex((c) => c.shape !== base.target);
    const cells = base.cells.map((c, k) => (k === i ? { ...c, extras: [base.target as (typeof ART_CATEGORIES)[number]] } : c));
    const r = verifyImageGridAnswer({ ...base, cells }, { selected: expectedSelection(base) });
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/malformed/);
  });
  it("rejects an unknown category, a bad art seed and too many extras without throwing", () => {
    const bad = (patch: object) => ({ ...base, cells: base.cells.map((c, k) => (k === 0 ? { ...c, ...patch } : c)) }) as unknown as ImageGridChallenge;
    for (const patch of [{ shape: "spaceship" }, { art: -1 }, { art: 1.5 }, { art: "x" }, { extras: ["tree", "tree", "tree", "tree"] }, { extras: ["nope"] }, { extras: "tree" }]) {
      expect(verifyImageGridAnswer(bad(patch), { selected: [] }).passed, JSON.stringify(patch)).toBe(false);
    }
    expect(verifyImageGridAnswer({ ...base, target: "spaceship" } as unknown as ImageGridChallenge, { selected: [] }).passed).toBe(false);
  });
});

describe("verifier: a grid must be one family and must have an answer", () => {
  const base = gen(3, "photo-categories", "medium");
  it("a picture target over shape cells, or a grid with no matching cell, is malformed (an empty selection cannot pass)", () => {
    const shapes = base.cells.map((c) => ({ id: c.id, shape: "circle" as const }));
    expect(verifyImageGridAnswer({ ...base, cells: shapes }, { selected: [] }).reason).toMatch(/malformed/);
    const noAnswer = base.cells.map((c) => ({ ...c, shape: c.shape === base.target ? ("chair" as const) === base.target ? ("cat" as const) : ("chair" as const) : c.shape }));
    expect(verifyImageGridAnswer({ ...base, cells: noAnswer }, { selected: [] }).passed).toBe(false);
    expect(verifyImageGridAnswer({ ...base, target: "circle" }, { selected: [] }).reason).toMatch(/malformed/);
  });
});
