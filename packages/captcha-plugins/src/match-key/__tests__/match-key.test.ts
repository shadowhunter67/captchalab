import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  MATCH_KEY_VARIANTS,
  applyOptionActivation,
  extractMatchKeyFeatures,
  generateMatchKeyChallenge,
  makeMatchOptionTarget,
  matchKeyPlugin,
  parseMatchOptionTarget,
  sameOn,
  verifyMatchKeyAnswer,
  type MatchKeyChallenge,
} from "../../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generateMatchKeyChallenge({ rng: createRng(seed), variantId, difficulty });

describe("generator", () => {
  it("is deterministic, valid and has exactly one answer for every variant, difficulty and many seeds", () => {
    for (const v of MATCH_KEY_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        const p = v.difficulties[d]!;
        for (let seed = 0; seed < 60; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.options).toHaveLength(p.options);
          expect(c.keyAttrs).toHaveLength(p.keyAttributes);
          const matching = c.options.filter((o) => sameOn(o, c.reference, c.keyAttrs));
          expect(matching.map((o) => o.id)).toEqual([c.correctId]);
          for (const o of c.options) if (o.id !== c.correctId) {
            const diff = c.keyAttrs.filter((a) => o[a] !== c.reference[a]).length;
            expect(diff).toBeGreaterThanOrEqual(p.minDiff);
            expect(diff).toBeLessThanOrEqual(p.maxDiff);
          }
          expect(matchKeyPlugin.verify(c, { selectedId: c.correctId }, { schemaVersion: SCHEMA_VERSION } as never).passed).toBe(true);
        }
      }
    }
  });
  it("exact match has an option identical in all three attributes; attribute match changes the free one", () => {
    for (let seed = 0; seed < 30; seed++) {
      const exact = gen(seed, "exact", "medium");
      const twin = exact.options.find((o) => o.id === exact.correctId)!;
      expect([twin.shape, twin.pattern, twin.orientation]).toEqual([exact.reference.shape, exact.reference.pattern, exact.reference.orientation]);
      const attr = gen(seed, "attribute", "medium");
      const right = attr.options.find((o) => o.id === attr.correctId)!;
      const free = (["shape", "pattern", "orientation"] as const).find((a) => !attr.keyAttrs.includes(a))!;
      expect(right[free]).not.toBe(attr.reference[free]);
    }
  });
  it("difficulty adds options; an unknown variant or level is rejected", () => {
    expect([gen(1, "exact", "easy"), gen(1, "exact", "medium"), gen(1, "exact", "hard")].map((c) => c.options.length)).toEqual([4, 5, 6]);
    expect(() => gen(1, "nope")).toThrow();
    expect(gen(1).config).toMatchObject({ variantId: "exact", difficulty: "medium" });
  });
});

describe("verifier", () => {
  const c = gen(5, "attribute", "hard");
  const wrong = c.options.find((o) => o.id !== c.correctId)!.id;
  it("passes only the correct option", () => {
    expect(verifyMatchKeyAnswer(c, { selectedId: c.correctId }).passed).toBe(true);
    expect(verifyMatchKeyAnswer(c, { selectedId: wrong }).passed).toBe(false);
    expect(verifyMatchKeyAnswer(c, { selectedId: null }).passed).toBe(false);
  });
  it("never throws on malformed answers or challenges", () => {
    for (const a of [undefined, null, 1, "o1", {}, { selectedId: 3 }, { selectedId: "zz" }, { selectedId: {} }]) {
      expect(verifyMatchKeyAnswer(c, a as never).passed).toBe(false);
    }
    for (const bad of [undefined, null, 5, {}, { ...c, options: [] }, { ...c, correctId: "zz" }, { ...c, options: [...c.options, c.options[0]] }]) {
      const r = verifyMatchKeyAnswer(bad as never, { selectedId: c.correctId });
      expect(r.passed).toBe(false);
    }
  });
  it("rejects an ambiguous challenge (two options match the key)", () => {
    const twin = { ...c.options.find((o) => o.id === c.correctId)!, id: "dup" };
    expect(verifyMatchKeyAnswer({ ...c, options: [...c.options, twin] }, { selectedId: c.correctId }).passed).toBe(false);
  });
});

describe("selection rule and targets", () => {
  it("select, replace, clear", () => {
    expect(applyOptionActivation(null, "o1")).toEqual({ selected: "o1", effect: "select" });
    expect(applyOptionActivation("o1", "o2")).toEqual({ selected: "o2", effect: "replace" });
    expect(applyOptionActivation("o2", "o2")).toEqual({ selected: null, effect: "clear" });
  });
  it("targets round-trip and reject junk", () => {
    expect(parseMatchOptionTarget(makeMatchOptionTarget("o3"))).toBe("o3");
    for (const t of [undefined, "", "mk-option:", "mk-option:A B", "sm-source:o1"]) expect(parseMatchOptionTarget(t)).toBeNull();
  });
});

describe("features", () => {
  const c: MatchKeyChallenge = gen(2, "exact", "medium");
  const wrong = c.options.find((o) => o.id !== c.correctId)!.id;
  const click = (t: number, id: string): InteractionEvent[] => {
    const target = makeMatchOptionTarget(id);
    return [
      { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
      { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    ];
  };
  const key = (t: number, id: string, code = "Enter"): InteractionEvent[] => [{ t, type: "keydown", code, target: makeMatchOptionTarget(id) }, { t: t + 5, type: "keyup", code, target: makeMatchOptionTarget(id) }];
  const session = (events: InteractionEvent[]): InteractionSession => ({ schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "match-key", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events) });
  const f = (events: InteractionEvent[]) => extractMatchKeyFeatures(c, session(events)).features;

  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, timeToFirstSelection: null, selectionCount: 0, wrongSelectionCount: 0, correctionCount: 0 });
  });
  it("counts wrong selections and corrections (golden)", () => {
    const r = f([...click(100, wrong), ...click(300, c.correctId)]);
    expect(r).toMatchObject({ reactionTime: 100, timeToFirstSelection: 110, selectionCount: 2, wrongSelectionCount: 1, correctionCount: 1 });
    expect(extractMatchKeyFeatures(c, session([])).schemaVersion).toBe("match-key@1");
  });
  it("clearing the selection is a correction", () => {
    expect(f([...click(100, c.correctId), ...click(300, c.correctId)])).toMatchObject({ selectionCount: 1, correctionCount: 1, wrongSelectionCount: 0 });
  });
  it("keyboard activations count, and the modality is keyboard", () => {
    const r = f(key(100, c.correctId));
    expect(r).toMatchObject({ selectionCount: 1, timeToFirstSelection: 100, inputModality: "keyboard" });
  });
  it("a press released elsewhere is not an activation", () => {
    const t = makeMatchOptionTarget(c.correctId);
    const r = f([
      { t: 100, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: t },
      { t: 150, type: "pointercancel", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: t },
    ]);
    expect(r).toMatchObject({ reactionTime: 100, selectionCount: 0, timeToFirstSelection: null });
  });
});
