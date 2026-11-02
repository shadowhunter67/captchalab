import { describe, expect, it } from "vitest";
import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import {
  ART_GROUPS,
  GLYPH_SHAPES,
  generateMatchKeyChallenge,
  generateShapeMatchingChallenge,
  generateTileGameChallenge,
  isGlyphSkin,
  pickSkin,
  verifyMatchKeyAnswer,
  verifyShapeMatchingAnswer,
  verifyTileGameAnswer,
  type ArtCategory,
} from "../../index";

const groupOf = (c: ArtCategory): string => Object.entries(ART_GROUPS).find(([, m]) => m.includes(c))![0];
const ctx = (seed: number, variantId: string, difficulty: CaptchaDifficulty = "medium") => ({ rng: createRng(seed), variantId, difficulty });

describe("glyph skin (object variants of MatchKey and Tile Game)", () => {
  it("a skin is four objects from four different look-alike groups, and is deterministic", () => {
    for (let seed = 0; seed < 100; seed++) {
      const a = pickSkin(createRng(seed));
      expect(a).toEqual(pickSkin(createRng(seed)));
      expect(isGlyphSkin(a)).toBe(true);
      expect(a.objects).toHaveLength(GLYPH_SHAPES.length);
      expect(new Set(a.objects.map(groupOf)).size).toBe(GLYPH_SHAPES.length);
    }
    expect(isGlyphSkin({ objects: ["bus", "bus", "cat", "tree"] })).toBe(false);
    expect(isGlyphSkin({ objects: ["nope", "cat", "tree", "house"] })).toBe(false);
    expect(isGlyphSkin(null)).toBe(false);
  });

  it("only the object variants carry a skin, and the glyph board of a seed is the same either way", () => {
    for (const [glyphVariant, objectVariant] of [["exact", "exact-object"], ["attribute", "attribute-object"]] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const g = generateMatchKeyChallenge(ctx(seed, glyphVariant));
        const o = generateMatchKeyChallenge(ctx(seed, objectVariant));
        expect(g.skin).toBeUndefined();
        expect(isGlyphSkin(o.skin)).toBe(true);
        const { skin: _skin, config: _c1, ...objectBoard } = o;
        const { config: _c2, ...glyphBoard } = g;
        expect(objectBoard).toEqual(glyphBoard); // same board, only dressed differently
        // The rule is still the abstract one: exactly one option is right, whatever it looks like.
        expect(verifyMatchKeyAnswer(o, { selectedId: o.correctId }).passed).toBe(true);
        expect(o.options.filter((x) => verifyMatchKeyAnswer(o, { selectedId: x.id }).passed)).toHaveLength(1);
      }
    }
    for (const [glyphVariant, objectVariant] of [["pair", "pair-object"], ["pattern", "pattern-object"]] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const g = generateTileGameChallenge(ctx(seed, glyphVariant));
        const o = generateTileGameChallenge(ctx(seed, objectVariant));
        expect(g.skin).toBeUndefined();
        expect(isGlyphSkin(o.skin)).toBe(true);
        expect(o.kind).toBe(g.kind);
        expect(o.answerIds).toEqual(g.answerIds);
        expect(verifyTileGameAnswer(o, { selectedIds: o.answerIds }).passed).toBe(true);
      }
    }
  });

  it("a malformed skin makes the challenge invalid instead of crashing the page", () => {
    const o = generateMatchKeyChallenge(ctx(4, "exact-object"));
    expect(verifyMatchKeyAnswer({ ...o, skin: { objects: ["bus", "car", "cat", "tree"] } }, { selectedId: o.correctId }).passed).toBe(true); // distinct objects: valid (groups are only a generator rule)
    expect(verifyMatchKeyAnswer({ ...o, skin: { objects: ["bus", "bus", "cat", "tree"] } }, { selectedId: o.correctId }).reason).toMatch(/malformed/);
    const t = generateTileGameChallenge(ctx(4, "pair-object"));
    expect(verifyTileGameAnswer({ ...t, skin: { objects: [] } }, { selectedIds: t.answerIds }).reason).toMatch(/malformed/);
  });
});

describe("shape matching object-silhouette variant", () => {
  it("is deterministic, uses objects from different groups, and has exactly one right matching", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 80; seed++) {
        const c = generateShapeMatchingChallenge(ctx(seed, "object-silhouette", d));
        expect(c).toEqual(generateShapeMatchingChallenge(ctx(seed, "object-silhouette", d)));
        const objects = c.sources.map((s) => s.shape as ArtCategory);
        expect(new Set(objects.map(groupOf)).size).toBe(objects.length);
        expect(c.sources.every((s) => s.filled)).toBe(true); // pictures
        expect(c.targets.every((t) => !t.filled)).toBe(true); // silhouettes
        expect(verifyShapeMatchingAnswer(c, { matches: c.matches }).passed).toBe(true);
      }
    }
  });
});
