import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type CaptchaDifficulty,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  EMPTY_MATCH_STATE,
  SHAPE_MATCHING_VARIANTS,
  answerFromState,
  applyActivation,
  extractShapeMatchingFeatures,
  generateShapeMatchingChallenge,
  makeSourceTarget,
  makeTargetTarget,
  parseMatchTarget,
  shapeMatchingPlugin,
  verifyShapeMatchingAnswer,
  type ShapeMatchingChallenge,
} from "../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) =>
  generateShapeMatchingChallenge({ rng: createRng(seed), variantId, difficulty });

describe("generator", () => {
  it("is deterministic and valid for every variant, difficulty and many seeds", () => {
    for (const v of SHAPE_MATCHING_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        const p = v.difficulties[d]!;
        for (let seed = 0; seed < 30; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.sources).toHaveLength(p.pairs);
          expect(c.targets).toHaveLength(p.pairs);
          expect(new Set(c.sources.map((s) => s.shape)).size).toBe(p.pairs); // one source per shape
          expect(new Set(c.targets.map((t) => t.shape)).size).toBe(p.pairs);
          // exactly one correct partner per source: the target with the same structural shape
          for (const s of c.sources) {
            const same = c.targets.filter((t) => t.shape === s.shape);
            expect(same).toHaveLength(1);
            expect(c.matches[s.id]).toBe(same[0]!.id);
          }
        }
      }
    }
  });
  it("exact targets look identical; pattern targets differ in presentation", () => {
    const exact = gen(3, "exact", "hard");
    expect(exact.targets.every((t) => t.rotation === 0 && t.filled && t.scale === 1)).toBe(true);
    let differs = 0;
    for (let seed = 0; seed < 20; seed++) {
      differs += gen(seed, "pattern", "hard").targets.some((t) => t.rotation !== 0 || !t.filled || t.scale !== 1) ? 1 : 0;
    }
    expect(differs).toBe(20);
  });
  it("difficulty adds pairs; high similarity always contains both look-alike pairs", () => {
    expect([gen(1, "exact", "easy"), gen(1, "exact", "medium"), gen(1, "exact", "hard")].map((c) => c.sources.length)).toEqual([3, 4, 5]);
    for (let seed = 0; seed < 20; seed++) {
      const shapes = gen(seed, "exact", "hard").sources.map((s) => s.shape);
      for (const s of ["circle", "oval", "square", "rounded"]) expect(shapes).toContain(s);
    }
  });
  it("records its configuration", () => {
    expect(gen(1, "pattern", "medium").config).toMatchObject({ variantId: "pattern", difficulty: "medium", parameters: { pairs: 4, similarity: "medium" } });
  });
});

describe("verifier", () => {
  const c = gen(5, "exact", "easy");
  const right = Object.fromEntries(c.sources.map((s) => [s.id, c.matches[s.id]!]));
  it("passes the full correct matching", () => {
    expect(verifyShapeMatchingAnswer(c, { matches: right }).passed).toBe(true);
  });
  it("fails wrong, missing and swapped matches with different reasons", () => {
    const [a, b] = c.sources;
    const swapped = { ...right, [a!.id]: right[b!.id]!, [b!.id]: right[a!.id]! };
    expect(verifyShapeMatchingAnswer(c, { matches: swapped })).toMatchObject({ passed: false, measurements: { wrong: 2 } });
    expect(verifyShapeMatchingAnswer(c, { matches: { ...right, [a!.id]: null } })).toMatchObject({ passed: false, measurements: { unmatched: 1 } });
    expect(verifyShapeMatchingAnswer(c, { matches: {} }).passed).toBe(false);
  });
  it("rejects unknown ids and malformed input without throwing", () => {
    expect(verifyShapeMatchingAnswer(c, { matches: { zz: "t1" } }).passed).toBe(false);
    expect(verifyShapeMatchingAnswer(c, { matches: { s1: "zz" } }).passed).toBe(false);
    for (const a of [undefined, null, {}, { matches: [] }, { matches: "x" }, 5]) expect(verifyShapeMatchingAnswer(c, a as never).passed).toBe(false);
    for (const ch of [undefined, null, {}, { ...c, matches: {} }, { ...c, targets: c.targets.slice(1) }]) {
      expect(verifyShapeMatchingAnswer(ch as never, { matches: right }).passed).toBe(false);
    }
  });
  it("ignores the interaction", () => {
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "shape-matching", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(shapeMatchingPlugin.verify(c, { matches: right }, empty).passed).toBe(true);
  });
});

describe("matching rules", () => {
  const c = gen(2, "exact", "easy");
  const s1 = c.sources[0]!;
  const s2 = c.sources[1]!;
  const t1 = c.targets.find((t) => t.id === c.matches[s1.id])!;
  const t2 = c.targets.find((t) => t.id === c.matches[s2.id])!;
  const src = (id: string) => ({ kind: "source" as const, id });
  const tgt = (id: string) => ({ kind: "target" as const, id });

  it("select, then target makes a match; selecting again deselects", () => {
    const a = applyActivation(EMPTY_MATCH_STATE, src(s1.id), c);
    expect(a.effect).toBe("select");
    const b = applyActivation(a.state, tgt(t1.id), c);
    expect(b).toMatchObject({ effect: "match", replaced: false, correct: true });
    expect(b.state).toEqual({ selected: null, matches: { [s1.id]: t1.id } });
    expect(applyActivation(applyActivation(EMPTY_MATCH_STATE, src(s1.id), c).state, src(s1.id), c).effect).toBe("deselect");
  });
  it("a new match for the same source or the same target replaces the old one", () => {
    let st = applyActivation(applyActivation(EMPTY_MATCH_STATE, src(s1.id), c).state, tgt(t2.id), c).state; // wrong
    const redo = applyActivation(applyActivation(st, src(s1.id), c).state, tgt(t1.id), c);
    expect(redo).toMatchObject({ effect: "match", replaced: true, correct: true });
    expect(redo.state.matches).toEqual({ [s1.id]: t1.id });
    st = redo.state;
    const bump = applyActivation(applyActivation(st, src(s2.id), c).state, tgt(t1.id), c); // t1 already used by s1
    expect(bump.replaced).toBe(true);
    expect(bump.state.matches).toEqual({ [s2.id]: t1.id });
  });
  it("activating a matched target with nothing selected removes the match; unknown ids do nothing", () => {
    const st = applyActivation(applyActivation(EMPTY_MATCH_STATE, src(s1.id), c).state, tgt(t1.id), c).state;
    const removed = applyActivation(st, tgt(t1.id), c);
    expect(removed).toMatchObject({ effect: "unmatch", state: { matches: {} } });
    expect(applyActivation(EMPTY_MATCH_STATE, tgt(t1.id), c).effect).toBe("none");
    expect(applyActivation(EMPTY_MATCH_STATE, src("zz"), c).effect).toBe("none");
    expect(applyActivation(EMPTY_MATCH_STATE, tgt("zz"), c).effect).toBe("none");
  });
  it("answerFromState lists every source", () => {
    expect(answerFromState(c, EMPTY_MATCH_STATE)).toEqual(Object.fromEntries(c.sources.map((s) => [s.id, null])));
  });
  it("targets round-trip and bad targets are rejected", () => {
    expect(parseMatchTarget(makeSourceTarget("s1"))).toEqual({ kind: "source", id: "s1" });
    expect(parseMatchTarget(makeTargetTarget("t4"))).toEqual({ kind: "target", id: "t4" });
    for (const t of [undefined, "", "slider-handle", "sm-source:", "sm-target:A B"]) expect(parseMatchTarget(t)).toBeNull();
  });
});

describe("features", () => {
  const c: ShapeMatchingChallenge = gen(2, "exact", "easy");
  const s1 = c.sources[0]!;
  const s2 = c.sources[1]!;
  const own = (id: string) => c.matches[id]!;
  const click = (t: number, target: string): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
  ];
  const key = (t: number, target: string, code = "Space"): InteractionEvent[] => [
    { t, type: "keydown", code, target },
    { t: t + 5, type: "keyup", code, target },
  ];
  const session = (events: InteractionEvent[]): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "shape-matching", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  });
  const f = (events: InteractionEvent[]) => extractShapeMatchingFeatures(c, session(events)).features;

  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, timeToFirstMatch: null, selectionCount: 0, matchAttempts: 0, correctionCount: 0, interActionTimeMean: null });
  });
  it("counts correct and incorrect attempts and corrections", () => {
    const r = f([
      ...click(100, makeSourceTarget(s1.id)), ...click(300, makeTargetTarget(own(s2.id))), // wrong
      ...click(500, makeSourceTarget(s1.id)), ...click(700, makeTargetTarget(own(s1.id))), // fixes it (replaces)
      ...click(900, makeSourceTarget(s2.id)), ...click(1100, makeTargetTarget(own(s2.id))), // right
    ]);
    expect(r).toMatchObject({ reactionTime: 100, selectionCount: 3, matchAttempts: 3, correctMatchCount: 2, incorrectMatchCount: 1, correctionCount: 1 });
    expect(r.timeToFirstMatch).toBe(310);
    expect(r.interActionTimeMean).toBeCloseTo((200 + 200 + 200 + 200 + 200) / 5);
  });
  it("a replaced match and a removed match count as corrections", () => {
    const r = f([
      ...click(0, makeSourceTarget(s1.id)), ...click(100, makeTargetTarget(own(s1.id))),
      ...click(200, makeSourceTarget(s1.id)), ...click(300, makeTargetTarget(own(s2.id))), // replaces
      ...click(400, makeTargetTarget(own(s2.id))), // removes
    ]);
    expect(r.correctionCount).toBe(2);
  });
  it("keyboard activations work and set the modality", () => {
    const r = f([...key(50, makeSourceTarget(s1.id)), ...key(200, makeTargetTarget(own(s1.id)), "Enter")]);
    expect(r).toMatchObject({ matchAttempts: 1, correctMatchCount: 1, inputModality: "keyboard" });
  });
  it("ignores other keys, other targets and presses released on another cell", () => {
    const off: InteractionEvent[] = [
      { t: 0, type: "pointerdown", x: 0, y: 0, pointerId: 1, pointerType: "mouse", target: makeSourceTarget(s1.id) },
      { t: 5, type: "pointerup", x: 0, y: 0, pointerId: 1, pointerType: "mouse", target: makeSourceTarget(s2.id) },
    ];
    const r = f([...key(1, makeSourceTarget(s1.id), "KeyA"), ...off, ...click(20, "slider-handle")]);
    expect(r.selectionCount).toBe(0);
  });
});

describe("a challenge whose pairs show different shapes is rejected", () => {
  it("fails even when the answer follows the declared matches", () => {
    const c = gen(5, "exact", "easy");
    const [a, b] = c.sources;
    const bad = { ...c, matches: { ...c.matches, [a!.id]: c.matches[b!.id]!, [b!.id]: c.matches[a!.id]! } };
    expect(verifyShapeMatchingAnswer(bad, { matches: bad.matches }).passed).toBe(false);
  });
});
