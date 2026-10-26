import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  EMPTY_RECALL,
  MEMORY_VARIANTS,
  applyRecall,
  extractMemoryFeatures,
  generateMemoryChallenge,
  makeMemoryCellTarget,
  makeMemoryOptionTarget,
  memoryAnswer,
  memoryPlugin,
  parseMemoryTarget,
  verifyMemoryAnswer,
  type MemoryPositionChallenge,
  type MemorySequenceChallenge,
} from "../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty) => generateMemoryChallenge({ rng: createRng(seed), variantId, difficulty });
const seq = (seed: number, d: CaptchaDifficulty) => gen(seed, "sequence", d) as MemorySequenceChallenge;
const pos = (seed: number, d: CaptchaDifficulty) => gen(seed, "position", d) as MemoryPositionChallenge;
const LEVELS = ["easy", "medium", "hard"] as const;

describe("generator", () => {
  it("is deterministic and follows the preset for every variant and level", () => {
    for (const d of LEVELS) {
      const ps = MEMORY_VARIANTS.variants[0]!.difficulties[d]!;
      const pp = MEMORY_VARIANTS.variants[1]!.difficulties[d]!;
      for (let seed = 0; seed < 60; seed++) {
        const s = seq(seed, d);
        expect(s).toEqual(seq(seed, d));
        expect(s.sequence).toHaveLength(ps.items);
        expect(s.options).toHaveLength(ps.options);
        expect(new Set(s.sequence).size).toBe(ps.items); // distinct items
        expect(new Set(s.options.map((o) => o.shape)).size).toBe(ps.options);
        expect(s.sequence.every((id) => s.options.some((o) => o.id === id))).toBe(true);
        expect(s.previewMs).toBe(ps.previewMs);
        const p = pos(seed, d);
        expect(p).toEqual(pos(seed, d));
        expect(p.size).toBe(pp.gridSize);
        expect(p.targets).toHaveLength(pp.cells);
        expect(new Set(p.targets).size).toBe(pp.cells);
        expect(p.targets.every((c) => Number(c.slice(1)) >= 1 && Number(c.slice(1)) <= p.size ** 2)).toBe(true);
      }
    }
  });
  it("harder levels show more, for less time per item", () => {
    expect(LEVELS.map((d) => seq(1, d).sequence.length)).toEqual([3, 4, 5]);
    const perItem = LEVELS.map((d) => seq(1, d).previewMs / seq(1, d).sequence.length);
    expect(perItem[0]).toBeGreaterThan(perItem[1]!);
    expect(perItem[1]).toBeGreaterThan(perItem[2]!);
    expect(LEVELS.map((d) => pos(1, d).targets.length)).toEqual([2, 4, 6]);
    expect(pos(1, "hard").size).toBe(4);
  });
  it("records its configuration", () => {
    expect(seq(1, "hard").config).toMatchObject({ variantId: "sequence", difficulty: "hard", parameters: { items: 5, previewMs: 3000 } });
  });
});

describe("verifier", () => {
  it("sequence: exact order only", () => {
    const c = seq(4, "medium");
    expect(verifyMemoryAnswer(c, { kind: "sequence", selections: [...c.sequence] }).passed).toBe(true);
    const swapped = [...c.sequence];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(verifyMemoryAnswer(c, { kind: "sequence", selections: swapped })).toMatchObject({ passed: false, reason: "The sequence is not in the right order." });
    expect(verifyMemoryAnswer(c, { kind: "sequence", selections: c.sequence.slice(0, 2) })).toMatchObject({ passed: false, reason: "The sequence is not complete yet." });
    expect(verifyMemoryAnswer(c, { kind: "sequence", selections: ["zz"] }).passed).toBe(false);
    expect(verifyMemoryAnswer(c, { kind: "sequence", selections: [] }).passed).toBe(false);
  });
  it("position: the exact set, any order", () => {
    const c = pos(4, "medium");
    expect(verifyMemoryAnswer(c, { kind: "position", selectedCells: [...c.targets].reverse() }).passed).toBe(true);
    expect(verifyMemoryAnswer(c, { kind: "position", selectedCells: c.targets.slice(1) })).toMatchObject({ passed: false, measurements: { missing: 1, extra: 0 } });
    expect(verifyMemoryAnswer(c, { kind: "position", selectedCells: [...c.targets, "c9"].filter((x, i, a) => a.indexOf(x) === i) })).toMatchObject({ passed: false });
    expect(verifyMemoryAnswer(c, { kind: "position", selectedCells: ["c99"] }).passed).toBe(false);
  });
  it("rejects malformed input without throwing; a wrong kind of answer fails", () => {
    const s = seq(1, "easy");
    const p = pos(1, "easy");
    for (const a of [undefined, null, {}, { kind: "sequence" }, { kind: "sequence", selections: "x" }, { kind: "position", selectedCells: [] }, 5]) {
      expect(verifyMemoryAnswer(s, a as never).passed).toBe(false);
    }
    expect(verifyMemoryAnswer(p, { kind: "sequence", selections: [] }).passed).toBe(false);
    for (const c of [undefined, null, {}, { ...s, sequence: [] }, { ...s, options: [] }, { ...p, size: 1 }, { ...p, targets: [] }, { ...p, kind: "other" }]) {
      expect(verifyMemoryAnswer(c as never, { kind: "sequence", selections: [] }).passed).toBe(false);
    }
  });
  it("ignores the interaction", () => {
    const c = seq(4, "easy");
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "memory", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(memoryPlugin.verify(c, memoryAnswer(c, { selected: c.sequence }), empty, ).passed).toBe(true);
  });
});

describe("recall rules", () => {
  const c = seq(4, "medium");
  const [a, b] = c.sequence as [string, string];
  it("sequence: select in order, undo, clear, ignore repeats and overflow", () => {
    let st = applyRecall(EMPTY_RECALL, { kind: "option", id: b }, c);
    expect(st).toMatchObject({ effect: "select", correct: false });
    st = applyRecall(st.state, { kind: "undo" }, c);
    expect(st).toMatchObject({ effect: "undo", state: { selected: [] } });
    st = applyRecall(st.state, { kind: "option", id: a }, c);
    expect(st.correct).toBe(true);
    expect(applyRecall(st.state, { kind: "option", id: a }, c).effect).toBe("none"); // each option once
    let full = EMPTY_RECALL;
    for (const id of c.sequence) full = applyRecall(full, { kind: "option", id }, c).state;
    expect(applyRecall(full, { kind: "option", id: c.options.find((o) => !c.sequence.includes(o.id))!.id }, c).effect).toBe("none"); // no more than the sequence length
    expect(applyRecall(full, { kind: "clear" }, c)).toMatchObject({ effect: "clear", state: { selected: [] } });
    expect(applyRecall(EMPTY_RECALL, { kind: "clear" }, c).effect).toBe("none");
    expect(applyRecall(EMPTY_RECALL, { kind: "cell", id: "c1" }, c).effect).toBe("none");
    expect(applyRecall(EMPTY_RECALL, { kind: "option", id: "zz" }, c).effect).toBe("none");
  });
  it("position: toggle cells; only targets count as correct", () => {
    const p = pos(4, "medium");
    const target = p.targets[0]!;
    const other = Array.from({ length: p.size ** 2 }, (_, i) => `c${i + 1}`).find((x) => !p.targets.includes(x))!;
    const on = applyRecall(EMPTY_RECALL, { kind: "cell", id: target }, p);
    expect(on).toMatchObject({ effect: "select", correct: true });
    expect(applyRecall(on.state, { kind: "cell", id: other }, p).correct).toBe(false);
    expect(applyRecall(on.state, { kind: "cell", id: target }, p)).toMatchObject({ effect: "deselect", state: { selected: [] } });
    expect(applyRecall(EMPTY_RECALL, { kind: "cell", id: "c99" }, p).effect).toBe("none");
    expect(applyRecall(EMPTY_RECALL, { kind: "undo" }, p).effect).toBe("none");
  });
  it("targets round-trip", () => {
    expect(parseMemoryTarget(makeMemoryOptionTarget("o2"))).toEqual({ kind: "option", id: "o2" });
    expect(parseMemoryTarget(makeMemoryCellTarget("c7"))).toEqual({ kind: "cell", id: "c7" });
    expect(parseMemoryTarget("mem-start")).toEqual({ kind: "start" });
    for (const t of [undefined, "", "mem-option:", "mem-cell:A B", "slider-handle"]) expect(parseMemoryTarget(t)).toBeNull();
  });
});

describe("features", () => {
  const c = seq(4, "medium");
  const press = (t: number, target: string): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
  ];
  const session = (events: InteractionEvent[]): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "memory", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  });
  const wrong = c.options.find((o) => !c.sequence.includes(o.id))!.id;

  it("separates the preview from recall and counts right, wrong and corrections", () => {
    const events = [
      ...press(100, "mem-start"),
      ...press(4000, makeMemoryOptionTarget(c.sequence[0]!)), // right
      ...press(4500, makeMemoryOptionTarget(wrong)), // wrong
      ...press(5000, "mem-undo"),
      ...press(5600, makeMemoryOptionTarget(c.sequence[1]!)), // right
    ];
    const f = extractMemoryFeatures(c, session(events), { recallStartMs: 3600 }).features;
    expect(f).toMatchObject({ reactionTime: 100, selectionCount: 3, correctSelections: 2, incorrectSelections: 1, correctionCount: 1, inputModality: "mouse" });
    expect(f.timeToFirstSelection).toBe(4010 - 3600);
    expect(f.recallDuration).toBe(5610 - 3600);
  });
  it("presses during the preview, and before recall began, do not count", () => {
    const events = [...press(100, "mem-start"), ...press(500, makeMemoryOptionTarget(c.sequence[0]!))];
    expect(extractMemoryFeatures(c, session(events), { recallStartMs: 3600 }).features).toMatchObject({ selectionCount: 0, timeToFirstSelection: null });
    expect(extractMemoryFeatures(c, session(events), { recallStartMs: null }).features).toMatchObject({ selectionCount: 0, recallDuration: null });
  });
  it("position: deselecting is a correction; keyboard activation works", () => {
    const p = pos(4, "easy");
    const t0 = p.targets[0]!;
    const key = (t: number, target: string): InteractionEvent => ({ t, type: "keydown", code: "Space", target });
    const events: InteractionEvent[] = [key(100, "mem-start"), key(3200, makeMemoryCellTarget(t0)), key(3400, makeMemoryCellTarget(t0)), key(3600, makeMemoryCellTarget(t0))];
    expect(extractMemoryFeatures(p, session(events), { recallStartMs: 3100 }).features).toMatchObject({ selectionCount: 2, correctSelections: 2, correctionCount: 1, inputModality: "keyboard" });
  });
  it("empty session", () => {
    expect(extractMemoryFeatures(c, session([]), { recallStartMs: null }).features).toMatchObject({ reactionTime: null, selectionCount: 0 });
  });
});
