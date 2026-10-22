import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  expectedSelection,
  extractImageGridFeatures,
  extractToggles,
  generateImageGridChallenge,
  imageGridPlugin,
  makeCellTarget,
  parseCellTarget,
  verifyImageGridAnswer,
  type ImageGridChallenge,
} from "../index";

const challenge: ImageGridChallenge = {
  id: "g",
  target: "circle",
  cells: [
    { id: "c1", shape: "circle" }, { id: "c2", shape: "square" }, { id: "c3", shape: "circle" },
    { id: "c4", shape: "star" }, { id: "c5", shape: "triangle" }, { id: "c6", shape: "square" },
    { id: "c7", shape: "star" }, { id: "c8", shape: "triangle" }, { id: "c9", shape: "square" },
  ],
};

const click = (t: number, cell: string, id = 1): InteractionEvent[] => [
  { t, type: "pointerdown", x: 1, y: 1, pointerId: id, pointerType: "mouse", target: makeCellTarget(cell) },
  { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: id, pointerType: "mouse", target: makeCellTarget(cell) },
];
const key = (t: number, cell: string, code = "Space"): InteractionEvent[] => [
  { t, type: "keydown", code, target: makeCellTarget(cell) },
  { t: t + 5, type: "keyup", code, target: makeCellTarget(cell) },
];
function session(events: InteractionEvent[], durationMs?: number): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "image-grid", startedAt: 0,
    durationMs: durationMs ?? events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  };
}
const f = (events: InteractionEvent[]) => extractImageGridFeatures(challenge, session(events)).features;

describe("generator", () => {
  it("is deterministic and valid", () => {
    const a = generateImageGridChallenge({ rng: createRng(3) });
    expect(generateImageGridChallenge({ rng: createRng(3) })).toEqual(a);
    expect(a.cells).toHaveLength(9);
    expect(new Set(a.cells.map((c) => c.id)).size).toBe(9);
    expect(a.id).toMatch(/^image-grid-[0-9a-f]{8}$/);
  });
  it("always has 2 to 4 matching cells across seeds", () => {
    for (let s = 0; s < 60; s++) {
      const n = expectedSelection(generateImageGridChallenge({ rng: createRng(s) })).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
    }
  });
});

describe("verifier", () => {
  it("passes the exact set in any order", () => {
    expect(verifyImageGridAnswer(challenge, { selected: ["c3", "c1"] }).passed).toBe(true);
  });
  it("fails missing, extra, both, empty", () => {
    expect(verifyImageGridAnswer(challenge, { selected: ["c1"] }).measurements).toMatchObject({ missing: 1, extra: 0 });
    expect(verifyImageGridAnswer(challenge, { selected: ["c1", "c3", "c2"] }).measurements).toMatchObject({ missing: 0, extra: 1 });
    expect(verifyImageGridAnswer(challenge, { selected: ["c1", "c2"] }).passed).toBe(false);
    expect(verifyImageGridAnswer(challenge, { selected: [] }).passed).toBe(false);
  });
  it("rejects unknown ids and malformed input without throwing", () => {
    expect(verifyImageGridAnswer(challenge, { selected: ["zz"] }).passed).toBe(false);
    for (const a of [undefined, null, {}, { selected: "c1" }, { selected: [1] }, 5]) {
      expect(verifyImageGridAnswer(challenge, a as never).passed).toBe(false);
    }
    for (const c of [undefined, null, 5, {}, { target: "circle", cells: [] }, { target: "blob", cells: [{ id: "a", shape: "x" }] }]) {
      expect(verifyImageGridAnswer(c as never, { selected: [] }).passed).toBe(false);
    }
  });
  it("rejects a grid that is not 3x3 with known shapes, and oversized answers", () => {
    const small = { ...challenge, cells: challenge.cells.slice(0, 4) };
    expect(verifyImageGridAnswer(small, { selected: ["c1", "c3"] }).passed).toBe(false);
    const badShape = { ...challenge, cells: challenge.cells.map((c, i) => (i === 0 ? { ...c, shape: "blob" } : c)) };
    expect(verifyImageGridAnswer(badShape as never, { selected: ["c1", "c3"] }).passed).toBe(false);
    expect(verifyImageGridAnswer({ ...challenge, id: 5 } as never, { selected: ["c1", "c3"] }).passed).toBe(false);
    expect(verifyImageGridAnswer(challenge, { selected: Array.from({ length: 100 }, () => "c1") }).passed).toBe(false);
  });
  it("ignores the interaction", () => {
    const busy = session(click(0, "c1"));
    expect(imageGridPlugin.verify(challenge, { selected: ["c1", "c3"] }, busy).passed).toBe(true);
    expect(imageGridPlugin.verify(challenge, { selected: ["c1", "c3"] }, session([])).passed).toBe(true);
  });
});

describe("targets", () => {
  it("round-trips and rejects bad targets", () => {
    expect(parseCellTarget(makeCellTarget("c4"))).toBe("c4");
    for (const t of [undefined, "", "slider-handle", "grid-cell:", "grid-cell:A B", "grid-cell:" + "x".repeat(40)]) {
      expect(parseCellTarget(t)).toBeNull();
    }
  });
});

describe("features", () => {
  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, timeToFirstSelection: null, selectionCount: 0, correctionCount: 0, interClickTimeMean: null, attemptCount: 0 });
  });
  it("counts selections, deselections and gaps", () => {
    const r = f([...click(100, "c1"), ...click(300, "c2"), ...click(500, "c2"), ...click(900, "c3")]);
    expect(r.reactionTime).toBe(100);
    expect(r.timeToFirstSelection).toBe(110);
    expect(r.selectionCount).toBe(2);
    expect(r.correctionCount).toBe(1);
    expect(r.interClickTimeMean).toBeCloseTo((200 + 200 + 400) / 3);
    expect(r.attemptCount).toBe(1);
    expect(r.inputModality).toBe("mouse");
  });
  it("keyboard toggles via Space and Enter", () => {
    const r = f([...key(50, "c1"), ...key(200, "c3", "Enter"), ...key(400, "c3")]);
    expect(r.selectionCount).toBe(1);
    expect(r.correctionCount).toBe(1);
    expect(r.inputModality).toBe("keyboard");
    expect(extractToggles(session([...key(50, "c1")]))[0]).toMatchObject({ cellId: "c1", input: "keyboard", selected: true });
  });
  it("ignores other keys, other targets, and press that moves off the cell", () => {
    const off: InteractionEvent[] = [
      { t: 0, type: "pointerdown", x: 0, y: 0, pointerId: 1, pointerType: "mouse", target: makeCellTarget("c1") },
      { t: 5, type: "pointerup", x: 0, y: 0, pointerId: 1, pointerType: "mouse", target: makeCellTarget("c2") },
    ];
    expect(extractToggles(session([...key(1, "c1", "KeyA"), ...off, ...click(20, "c1").map((e) => ({ ...e, target: "slider-handle" }))]))).toEqual([]);
  });
  it("ignores events for cells that are not in the grid", () => {
    const r = f([...click(10, "zz"), ...click(50, "c1")]);
    expect(r.selectionCount).toBe(1);
    expect(r.reactionTime).toBe(50);
  });
  it("splits attempts after a long pause", () => {
    expect(f([...click(0, "c1"), ...click(6500, "c2")]).attemptCount).toBe(2);
  });
  it("registers with correct id and schema", () => {
    expect(imageGridPlugin.id).toBe("image-grid");
    expect(extractImageGridFeatures(challenge, session([])).schemaVersion).toBeDefined();
  });
});
