import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  TILE_GAME_VARIANTS,
  applyTileActivation,
  extractTileGameFeatures,
  generateTileGameChallenge,
  lookKey,
  makeTileTarget,
  parseTileTarget,
  sameSet,
  verifyTileGameAnswer,
  type TileGameChallenge,
} from "../../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generateTileGameChallenge({ rng: createRng(seed), variantId, difficulty });

describe("generator", () => {
  it("is deterministic and has exactly one answer for every variant, difficulty and many seeds", () => {
    for (const v of TILE_GAME_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        const p = v.difficulties[d]!;
        for (let seed = 0; seed < 60; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.tiles).toHaveLength(p.tiles);
          expect(c.answerIds).toHaveLength(p.required);
          expect(verifyTileGameAnswer(c, { selectedIds: c.answerIds }).passed).toBe(true);
        }
      }
    }
  });
  it("pair match: one identical pair, every other tile unique", () => {
    for (let seed = 0; seed < 40; seed++) {
      const c = gen(seed, "pair", "hard");
      const groups = new Map<string, string[]>();
      for (const t of c.tiles) groups.set(lookKey(t), [...(groups.get(lookKey(t)) ?? []), t.id]);
      const dupes = [...groups.values()].filter((g) => g.length > 1);
      expect(dupes).toHaveLength(1);
      expect(sameSet(dupes[0]!, c.answerIds)).toBe(true);
    }
  });
  it("pattern match: the answer is exactly the tiles sharing the rule attribute", () => {
    for (let seed = 0; seed < 40; seed++) {
      const c = gen(seed, "pattern", "hard");
      const attr = c.ruleAttr!;
      const matching = c.tiles.filter((t) => t[attr] === c.reference![attr]).map((t) => t.id);
      expect(sameSet(matching, c.answerIds)).toBe(true);
      expect(c.required).toBe(3);
    }
  });
  it("difficulty adds tiles; an unknown variant is rejected", () => {
    expect([gen(1, "pair", "easy"), gen(1, "pair", "medium"), gen(1, "pair", "hard")].map((c) => c.tiles.length)).toEqual([4, 6, 8]);
    expect(() => gen(1, "nope")).toThrow();
  });
});

describe("verifier", () => {
  const c = gen(7, "pair", "medium");
  const other = c.tiles.filter((t) => !c.answerIds.includes(t.id)).map((t) => t.id);
  it("passes only the exact set, in any order", () => {
    expect(verifyTileGameAnswer(c, { selectedIds: [...c.answerIds].reverse() }).passed).toBe(true);
    expect(verifyTileGameAnswer(c, { selectedIds: [c.answerIds[0]!, other[0]!] }).passed).toBe(false);
    expect(verifyTileGameAnswer(c, { selectedIds: [c.answerIds[0]!] }).passed).toBe(false);
    expect(verifyTileGameAnswer(c, { selectedIds: [] }).passed).toBe(false);
  });
  it("never throws on malformed input and rejects duplicates", () => {
    for (const a of [undefined, null, 1, {}, { selectedIds: "t1" }, { selectedIds: [1] }, { selectedIds: ["zz"] }, { selectedIds: [c.answerIds[0], c.answerIds[0]] }]) {
      expect(verifyTileGameAnswer(c, a as never).passed).toBe(false);
    }
    for (const bad of [undefined, null, {}, { ...c, tiles: [] }, { ...c, answerIds: [] }, { ...c, answerIds: [other[0], other[1]] }]) {
      expect(verifyTileGameAnswer(bad as never, { selectedIds: c.answerIds }).passed).toBe(false);
    }
  });
});

describe("selection rule and targets", () => {
  it("select, deselect, and ignore beyond the required count", () => {
    expect(applyTileActivation([], "t1", 2)).toEqual({ selected: ["t1"], effect: "select" });
    expect(applyTileActivation(["t1"], "t1", 2)).toEqual({ selected: [], effect: "deselect" });
    expect(applyTileActivation(["t1", "t2"], "t3", 2)).toEqual({ selected: ["t1", "t2"], effect: "ignored" });
  });
  it("targets round-trip and reject junk", () => {
    expect(parseTileTarget(makeTileTarget("t4"))).toBe("t4");
    for (const t of [undefined, "", "tg-tile:", "tg-tile:A B", "mk-option:t1"]) expect(parseTileTarget(t)).toBeNull();
  });
});

describe("features", () => {
  const c: TileGameChallenge = gen(3, "pair", "medium");
  const wrongTile = c.tiles.find((t) => !c.answerIds.includes(t.id))!.id;
  const click = (t: number, id: string): InteractionEvent[] => {
    const target = makeTileTarget(id);
    return [
      { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
      { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    ];
  };
  const session = (events: InteractionEvent[]): InteractionSession => ({ schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "tile-game", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events) });
  const f = (events: InteractionEvent[]) => extractTileGameFeatures(c, session(events)).features;

  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, firstSelectionTime: null, selectionCount: 0, wrongPairCount: 0, correctPairCount: 0, correctionCount: 0 });
  });
  it("a wrong pair, a deselect, then the right pair (golden)", () => {
    const [a, b] = c.answerIds as [string, string];
    const r = f([...click(100, a), ...click(300, wrongTile), ...click(500, wrongTile), ...click(700, b)]);
    expect(r).toMatchObject({ reactionTime: 100, firstSelectionTime: 110, selectionCount: 3, wrongPairCount: 1, correctPairCount: 1, correctionCount: 1 });
    expect(extractTileGameFeatures(c, session([])).schemaVersion).toBe("tile-game@1");
  });
  it("a third tile is ignored while the pair is full", () => {
    const [a, b] = c.answerIds as [string, string];
    expect(f([...click(100, a), ...click(200, b), ...click(300, wrongTile)])).toMatchObject({ selectionCount: 2, correctPairCount: 1, correctionCount: 0 });
  });
});
