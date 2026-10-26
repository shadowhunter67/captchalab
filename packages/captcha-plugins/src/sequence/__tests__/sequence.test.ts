import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  SEQUENCE_TARGET,
  SEQUENCE_VARIANTS,
  extractSequenceFeatures,
  generateSequenceChallenge,
  isUnambiguous,
  isVisualUnambiguous,
  makeOptionTarget,
  parseOptionTarget,
  predictionsFor,
  sequencePlugin,
  verifySequenceAnswer,
  type SequenceNumberChallenge,
  type SequenceVisualChallenge,
} from "../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty) => generateSequenceChallenge({ rng: createRng(seed), variantId, difficulty });
const num = (seed: number, d: CaptchaDifficulty) => gen(seed, "number", d) as SequenceNumberChallenge;
const vis = (seed: number, d: CaptchaDifficulty) => gen(seed, "visual", d) as SequenceVisualChallenge;
const LEVELS = ["easy", "medium", "hard"] as const;

describe("number sequences", () => {
  it("are deterministic, hide exactly one term (never the first two) and record the pattern", () => {
    for (const d of LEVELS) {
      for (let seed = 0; seed < 80; seed++) {
        const c = num(seed, d);
        expect(c).toEqual(num(seed, d));
        expect(c.terms.filter((t) => t === null)).toHaveLength(1);
        expect(c.hiddenIndex).toBeGreaterThanOrEqual(2);
        expect(c.terms[c.hiddenIndex]).toBeNull();
        expect(c.terms).toHaveLength(SEQUENCE_VARIANTS.variants[0]!.difficulties[d]!.length);
        expect(c.config?.parameters.pattern).toBe(c.rule);
      }
    }
  });
  it("each level draws from its own pattern families", () => {
    const rules = (d: CaptchaDifficulty) => new Set(Array.from({ length: 80 }, (_, s) => num(s, d).rule));
    expect([...rules("easy")]).toEqual(["arithmetic"]);
    expect([...rules("medium")].sort()).toEqual(["alternating", "geometric"]);
    expect([...rules("hard")]).toEqual(["interleaved"]);
  });
  it("every challenge has exactly one answer under the simplest consistent patterns", () => {
    for (const d of LEVELS) {
      for (let seed = 0; seed < 150; seed++) {
        const c = num(seed, d);
        expect(isUnambiguous(c.terms, c.hiddenIndex, c.rule, c.expectedAnswer)).toBe(true);
        // independently: the intended family predicts exactly one value and it is the answer
        const own = predictionsFor(c.terms, c.hiddenIndex, c.rule);
        expect([...own]).toEqual([c.expectedAnswer]);
      }
    }
  });
  it("the check really rejects ambiguous puzzles", () => {
    // 2, 4, ?, 8: arithmetic says 6 and geometric says 8... here only the arithmetic fit holds, so it is fine:
    expect(isUnambiguous([2, 4, null, 8], 2, "arithmetic", 6)).toBe(true);
    // 1, 2, ?, 8 fits geometric (4); arithmetic does not fit, so claiming arithmetic is rejected
    expect(isUnambiguous([1, 2, null, 8], 2, "arithmetic", 4)).toBe(false);
    // 2, 4, ?, 16: geometric says 8, an alternating rule (+2, +10?) does not fit all; but arithmetic cannot fit -> ok for geometric
    expect(isUnambiguous([2, 4, null, 16], 2, "geometric", 8)).toBe(true);
    // 2, 4, 8, ?: arithmetic fails, geometric predicts 16, alternating (+2,+4 ...) predicts 14: a "geometric" claim is ambiguous with alternating only if
    // alternating were simpler. It is not, so geometric 16 stands; claiming alternating (the more complex family) is ambiguous:
    expect(isUnambiguous([2, 4, 8, null], 3, "alternating", 14)).toBe(false);
  });
  it("answers: right number passes, anything else fails", () => {
    const c = num(1, "easy");
    expect(verifySequenceAnswer(c, { kind: "number", value: c.expectedAnswer }).passed).toBe(true);
    expect(verifySequenceAnswer(c, { kind: "number", value: c.expectedAnswer + 1 }).passed).toBe(false);
    for (const a of [undefined, null, {}, { kind: "number", value: "8" }, { kind: "number", value: 1.5 }, { kind: "option", optionId: "o1" }, { kind: "number" }]) {
      expect(verifySequenceAnswer(c, a as never).passed).toBe(false);
    }
  });
});

describe("visual sequences", () => {
  it("are deterministic with one hidden symbol and options that are distinct shapes", () => {
    for (const d of LEVELS) {
      const p = SEQUENCE_VARIANTS.variants[1]!.difficulties[d]!;
      for (let seed = 0; seed < 80; seed++) {
        const c = vis(seed, d);
        expect(c).toEqual(vis(seed, d));
        expect(c.cells).toHaveLength(p.length);
        expect(c.cells.filter((s) => s === null)).toHaveLength(1);
        expect(c.hiddenIndex).toBeGreaterThanOrEqual(Number(p.patterns));
        expect(new Set(c.options.map((o) => o.shape)).size).toBe(c.options.length);
        expect(c.options.length).toBeGreaterThanOrEqual(p.options > 3 ? 4 : 3);
        expect(c.pattern).toHaveLength(Number(p.patterns));
      }
    }
  });
  it("every challenge has exactly one answer and it is among the options", () => {
    for (const d of LEVELS) {
      for (let seed = 0; seed < 150; seed++) {
        const c = vis(seed, d);
        const expectedShape = c.options.find((o) => o.id === c.expectedOptionId)!.shape;
        expect(isVisualUnambiguous(c.cells, c.hiddenIndex, c.pattern.length, expectedShape)).toBe(true);
        // the hidden symbol follows the unit
        const full = Array.from({ length: c.cells.length }, (_, k) => c.pattern[k % c.pattern.length]);
        expect(c.cells.every((s, k) => k === c.hiddenIndex || (s !== null && c.cells.indexOf(s) === full.indexOf(full[k])))).toBe(true);
        expect(c.options.filter((o) => o.shape === expectedShape)).toHaveLength(1);
      }
    }
  });
  it("difficulty lengthens the repeating unit", () => {
    expect(LEVELS.map((d) => vis(1, d).pattern.length)).toEqual([2, 3, 4]);
  });
  it("answers: the right option passes, others and malformed input fail", () => {
    const c = vis(2, "medium");
    expect(verifySequenceAnswer(c, { kind: "option", optionId: c.expectedOptionId }).passed).toBe(true);
    const wrong = c.options.find((o) => o.id !== c.expectedOptionId)!;
    expect(verifySequenceAnswer(c, { kind: "option", optionId: wrong.id }).passed).toBe(false);
    expect(verifySequenceAnswer(c, { kind: "option", optionId: "zz" }).passed).toBe(false);
    for (const a of [undefined, null, {}, { kind: "option" }, { kind: "number", value: 1 }]) expect(verifySequenceAnswer(c, a as never).passed).toBe(false);
  });
  it("malformed challenges fail without throwing", () => {
    const c = vis(2, "easy");
    for (const bad of [undefined, null, {}, { ...c, kind: "other" }, { ...c, hiddenIndex: 0 }, { ...c, options: [] }, { ...c, expectedOptionId: "zz" }, { ...c, cells: [] }]) {
      expect(verifySequenceAnswer(bad as never, { kind: "option", optionId: "o1" }).passed).toBe(false);
    }
    const n = num(2, "easy");
    for (const bad of [{ ...n, hiddenIndex: 0 }, { ...n, terms: [1, 2] }, { ...n, expectedAnswer: 1.5 }]) {
      expect(verifySequenceAnswer(bad as never, { kind: "number", value: 1 }).passed).toBe(false);
    }
  });
});

describe("config and plugin", () => {
  it("records variant, difficulty and the pattern actually used; ignores the interaction", () => {
    const c = num(3, "hard");
    expect(c.config).toMatchObject({ variantId: "number", difficulty: "hard", parameters: { length: 6, pattern: "interleaved" } });
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "sequence", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(sequencePlugin.verify(c, { kind: "number", value: c.expectedAnswer }, empty).passed).toBe(true);
  });
  it("option targets round-trip", () => {
    expect(parseOptionTarget(makeOptionTarget("o2"))).toBe("o2");
    for (const t of [undefined, "", "seq-option:", "seq-option:A B", "slider-handle"]) expect(parseOptionTarget(t)).toBeNull();
  });
});

describe("features", () => {
  const session = (events: InteractionEvent[]): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "sequence", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  });
  const key = (t: number, code: string): InteractionEvent => ({ t, type: "keydown", code, target: SEQUENCE_TARGET });
  const click = (t: number, id: string): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: makeOptionTarget(id) },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: makeOptionTarget(id) },
  ];
  it("number: typing measurements; selection fields are null", () => {
    const f = extractSequenceFeatures(num(1, "easy"), session([key(100, "Digit"), key(300, "Backspace"), key(500, "Digit")])).features;
    expect(f).toMatchObject({ reactionTime: 100, timeToFirstKey: 100, keyCount: 2, backspaceCount: 1, correctionCount: 1, attemptCount: 1, selectionCount: null, timeToFirstSelection: null });
  });
  it("visual: selections, corrections and rounds; key fields are null", () => {
    const f = extractSequenceFeatures(vis(1, "easy"), session([...click(100, "o1"), ...click(300, "o2"), ...click(500, "o2"), ...click(7000, "o3")])).features;
    expect(f).toMatchObject({ reactionTime: 100, timeToFirstSelection: 110, selectionCount: 3, correctionCount: 2, attemptCount: 2, keyCount: null, timeToFirstKey: null, inputModality: "mouse" });
  });
  it("visual: Space and Enter activate; other keys and cells do not", () => {
    const k = (t: number, code: string): InteractionEvent => ({ t, type: "keydown", code, target: makeOptionTarget("o1") });
    const f = extractSequenceFeatures(vis(1, "easy"), session([k(10, "Space"), k(20, "KeyA"), ...click(30, "zz-not")])).features;
    expect(f).toMatchObject({ selectionCount: 1 });
  });
  it("empty sessions", () => {
    expect(extractSequenceFeatures(vis(1, "easy"), session([])).features).toMatchObject({ reactionTime: null, selectionCount: 0, correctionCount: 0, attemptCount: 0 });
    expect(extractSequenceFeatures(num(1, "easy"), session([])).features).toMatchObject({ keyCount: 0, correctionCount: 0 });
  });
});

describe("a challenge that contradicts itself is rejected", () => {
  it("number: a declared answer that does not follow the pattern", () => {
    const n = num(2, "easy");
    expect(verifySequenceAnswer({ ...n, expectedAnswer: 999 }, { kind: "number", value: 999 }).passed).toBe(false);
    expect(verifySequenceAnswer({ ...n, rule: "nope" } as never, { kind: "number", value: n.expectedAnswer }).passed).toBe(false);
  });
  it("visual: a declared option that does not follow the pattern", () => {
    const v = vis(2, "medium");
    const wrong = v.options.find((o) => o.id !== v.expectedOptionId)!;
    expect(verifySequenceAnswer({ ...v, expectedOptionId: wrong.id }, { kind: "option", optionId: wrong.id }).passed).toBe(false);
  });
});
