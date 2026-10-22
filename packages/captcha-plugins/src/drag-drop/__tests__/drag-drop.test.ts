import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type InteractionEvent,
  type InteractionSession,
  type PointerType,
} from "@captchalab/captcha-core";
import {
  allCorrect,
  allPlaced,
  clampToSurface,
  normalizedToPx,
  pxToNormalized,
  buildAnswer,
  createInitialState,
  deriveDragAttempts,
  dragDropPlugin,
  grabOffsetOf,
  heldCenterOf,
  extractDragDropFeatures,
  generateDragDropChallenge,
  hitTarget,
  makeDragItemTarget,
  makeDropTarget,
  parseDragDropTarget,
  resolveDrop,
  verifyDragDropAnswer,
  type DragDropChallenge,
  type DragDropLayout,
} from "../index";

/** 400 x 300 surface: scale 300, itemSize 0.17 -> 51px, hit radius 0.14 -> 42px. */
const layout: DragDropLayout = { width: 400, height: 300 };
const challenge: DragDropChallenge = {
  id: "c",
  itemSize: 0.17,
  dropTolerance: 0.14,
  items: [
    { id: "item-a", kind: "circle", start: { x: 0.25, y: 0.8 } }, // px (100, 240)
    { id: "item-b", kind: "square", start: { x: 0.75, y: 0.8 } }, // px (300, 240)
  ],
  targets: [
    { id: "target-a", acceptsItemId: "item-a", position: { x: 0.25, y: 0.2 } }, // px (100, 60)
    { id: "target-b", acceptsItemId: "item-b", position: { x: 0.75, y: 0.2 } }, // px (300, 60)
  ],
};

type Kind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
const ev = (
  t: number, type: Kind, x: number, y: number,
  o: { item?: string; id?: number; pointerType?: PointerType; target?: string } = {},
): InteractionEvent => ({
  t, type, x, y, pointerId: o.id ?? 1, pointerType: o.pointerType ?? "mouse",
  target: o.target ?? makeDragItemTarget(o.item ?? "item-a"),
});
const session = (events: InteractionEvent[], durationMs?: number): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "drag-drop", startedAt: 0,
  durationMs: durationMs ?? events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});

/** A drag of `item` from its start center (grabbed dead center) to `to`, released there. */
function drag(item: "item-a" | "item-b", t0: number, to: { x: number; y: number }, o: { id?: number; pointerType?: PointerType; cancel?: boolean; from?: { x: number; y: number } } = {}): InteractionEvent[] {
  // `from` = where the item currently rests (default: its start); pass it when an earlier drag moved it.
  const from = o.from ?? (item === "item-a" ? { x: 100, y: 240 } : { x: 300, y: 240 });
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const opts = { item, ...(o.id ? { id: o.id } : {}), ...(o.pointerType ? { pointerType: o.pointerType } : {}) };
  return [
    ev(t0, "pointerdown", from.x, from.y, opts),
    ev(t0 + 100, "pointermove", mid.x, mid.y, opts),
    ev(t0 + 200, o.cancel ? "pointercancel" : "pointerup", to.x, to.y, opts),
  ];
}
const features = (events: InteractionEvent[], duration?: number) =>
  extractDragDropFeatures(challenge, session(events, duration), { layout }).features;

describe("semantic targets", () => {
  it("round-trips and rejects malformed strings", () => {
    expect(parseDragDropTarget(makeDragItemTarget("item-a"))).toEqual({ kind: "drag-item", id: "item-a" });
    expect(parseDragDropTarget(makeDropTarget("target-1"))).toEqual({ kind: "drop-target", id: "target-1" });
    expect(parseDragDropTarget("drag-surface")).toEqual({ kind: "drag-surface" });
    for (const bad of [undefined, "", "drag-item:", "drag-item:a b", "drag-item:a:b", "other:x", "slider-handle", "drag-item:" + "x".repeat(33)]) {
      expect(parseDragDropTarget(bad)).toBeNull();
    }
    expect(() => makeDragItemTarget("bad id")).toThrow(RangeError);
  });
});

describe("generator", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = generateDragDropChallenge({ rng: createRng(3) });
    expect(generateDragDropChallenge({ rng: createRng(3) })).toEqual(a);
    expect(generateDragDropChallenge({ rng: createRng(4) })).not.toEqual(a);
    expect(a.id).toMatch(/^drag-drop-[0-9a-f]{8}$/);
  });

  it("always yields a valid, non-overlapping challenge (500 seeds, surfaces from phone to desktop)", () => {
    for (let seed = 0; seed < 500; seed++) {
      const c = generateDragDropChallenge({ rng: createRng(seed) });
      expect(new Set(c.items.map((i) => i.id)).size).toBe(3);
      expect(new Set(c.targets.map((t) => t.id)).size).toBe(3);
      expect(new Set(c.items.map((i) => i.kind)).size).toBe(3);
      expect(verifyDragDropAnswer(c, { placements: Object.fromEntries(c.items.map((i) => [i.id, c.targets.find((t) => t.acceptsItemId === i.id)?.id ?? null])) }).passed).toBe(true);
      for (const p of [...c.items.map((i) => i.start), ...c.targets.map((t) => t.position)]) {
        expect(p.x).toBeGreaterThanOrEqual(0.1);
        expect(p.x).toBeLessThanOrEqual(0.9);
        expect(p.y).toBeGreaterThanOrEqual(0.1);
        expect(p.y).toBeLessThanOrEqual(0.9);
      }
      for (const l of [{ width: 300, height: 225 }, { width: 560, height: 420 }, { width: 800, height: 800 }]) {
        const size = c.itemSize * Math.min(l.width, l.height);
        const radius = c.dropTolerance * Math.min(l.width, l.height);
        const px = (p: { x: number; y: number }) => ({ x: p.x * l.width, y: p.y * l.height });
        const pts = [...c.items.map((i) => ({ p: px(i.start), r: size / 2 })), ...c.targets.map((t) => ({ p: px(t.position), r: radius }))];
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const a = pts[i]!, b = pts[j]!;
            expect(Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y)).toBeGreaterThan(a.r + b.r - 1e-9 > 0 ? Math.min(a.r, b.r) : 0);
          }
        }
        // No item starts inside any target area (trivial challenge).
        for (const i of c.items) expect(hitTarget(c, l, px(i.start))).toBeNull();
      }
    }
  });
});

describe("verifier", () => {
  const good = { placements: { "item-a": "target-a", "item-b": "target-b" } };
  it("all correct passes; one wrong, one missing/unplaced fail with a reason", () => {
    expect(verifyDragDropAnswer(challenge, good).passed).toBe(true);
    const swapped = verifyDragDropAnswer(challenge, { placements: { "item-a": "target-b", "item-b": "target-a" } });
    expect(swapped).toMatchObject({ passed: false, measurements: { total: 2, placed: 2, correct: 0 } });
    expect(verifyDragDropAnswer(challenge, { placements: { "item-a": "target-a", "item-b": null } })).toMatchObject({
      passed: false, measurements: { placed: 1, correct: 1 },
    });
    expect(verifyDragDropAnswer(challenge, { placements: { "item-a": "target-a" } }).passed).toBe(false); // missing item
  });

  it("unknown ids, duplicate target, malformed values and shapes fail without throwing", () => {
    for (const a of [
      { placements: { "item-a": "target-a", "item-b": "nope" } },
      { placements: { ...good.placements, ghost: null } },
      { placements: { "item-a": "target-a", "item-b": "target-a" } },
      { placements: { "item-a": 5, "item-b": "target-b" } },
      { placements: [] }, { placements: null }, {}, null, undefined, 7, "x",
    ]) {
      expect(verifyDragDropAnswer(challenge, a as never).passed).toBe(false);
    }
    for (const c of [
      undefined, null, 5, {}, { items: [], targets: [] },
      { ...challenge, items: [challenge.items[0], challenge.items[0]] },
      { ...challenge, targets: [challenge.targets[0], { ...challenge.targets[1], acceptsItemId: "item-a" }] },
      { ...challenge, targets: [challenge.targets[0]] },
      { ...challenge, targets: [challenge.targets[0], { id: "target-b", acceptsItemId: "ghost" }] },
    ]) {
      expect(verifyDragDropAnswer(c as never, good).passed).toBe(false);
    }
  });

  it("does not read inherited or hostile values", () => {
    const c = { ...challenge, items: [{ id: "constructor" }, { id: "item-b" }], targets: [{ id: "target-x", acceptsItemId: "constructor" }, { id: "target-b", acceptsItemId: "item-b" }] };
    const inherited = Object.create({ constructor: "target-x" }) as Record<string, unknown>;
    inherited["item-b"] = "target-b";
    expect(verifyDragDropAnswer(c as never, { placements: inherited } as never).passed).toBe(false);
    class Placements { "item-a" = "target-a"; "item-b" = "target-b"; }
    expect(verifyDragDropAnswer(challenge, { placements: new Placements() } as never).passed).toBe(false);
    const nullProto = Object.assign(Object.create(null) as object, { "item-a": "target-a", "item-b": "target-b" });
    expect(verifyDragDropAnswer(challenge, { placements: nullProto }).passed).toBe(true);
    const throwing = { get placements(): never { throw new Error("boom"); } };
    expect(verifyDragDropAnswer(challenge, throwing as never).passed).toBe(false);
    expect(verifyDragDropAnswer(challenge, { placements: { "item-a": "target-a", "item-b": "target-b", __proto__x: null } }).passed).toBe(false);
    const badIds = { ...challenge, items: [{ id: "bad id" }, challenge.items[1]] };
    expect(verifyDragDropAnswer(badIds as never, good as never).passed).toBe(false);
  });

  it("ignores the interaction: behavior never decides pass/fail", () => {
    expect(dragDropPlugin.verify(challenge, good, session([]))).toEqual(
      dragDropPlugin.verify(challenge, good, session(drag("item-a", 0, { x: 100, y: 60 }))),
    );
  });
});

describe("geometry and drop rule", () => {
  it("hit test: inside, boundary (inclusive), outside, nearest of two", () => {
    expect(hitTarget(challenge, layout, { x: 100, y: 60 })?.id).toBe("target-a");
    expect(hitTarget(challenge, layout, { x: 100 + 42, y: 60 })?.id).toBe("target-a"); // exactly the radius
    expect(hitTarget(challenge, layout, { x: 100 + 42.01, y: 60 })).toBeNull();
    expect(hitTarget(challenge, layout, { x: 200, y: 60 })).toBeNull();
    const close = { ...challenge, targets: [{ ...challenge.targets[0]!, position: { x: 0.5, y: 0.2 } }, { ...challenge.targets[1]!, position: { x: 0.56, y: 0.2 } }] };
    expect(hitTarget(close, layout, { x: 215, y: 60 })?.id).toBe("target-b"); // 15 from b, 25 from a
  });

  it("resolveDrop: correct, wrong target, miss, bumping an occupant, release error", () => {
    const s0 = createInitialState(challenge);
    expect(resolveDrop(challenge, layout, s0, "item-a", { x: 110, y: 60 })).toMatchObject({ outcome: "correct", targetId: "target-a", releaseError: 10 });
    const wrong = resolveDrop(challenge, layout, s0, "item-a", { x: 300, y: 60 });
    expect(wrong).toMatchObject({ outcome: "wrong-target", targetId: "target-b" });
    expect(wrong.state.placements["item-a"]).toBe("target-b");
    expect(wrong.state.centers["item-a"]).toEqual({ x: 0.75, y: 0.2 }); // snapped to the target center
    const miss = resolveDrop(challenge, layout, s0, "item-a", { x: 200, y: 150 });
    expect(miss).toMatchObject({ outcome: "miss", targetId: null });
    expect(miss.state).toBe(s0);
    expect(miss.releaseError).toBeCloseTo(Math.hypot(100, 90));
    // target-b is held by item-b: item-a takes it (wrong target) and item-b goes back to its start
    const bHome = resolveDrop(challenge, layout, s0, "item-b", { x: 300, y: 60 }).state;
    const bumped = resolveDrop(challenge, layout, bHome, "item-a", { x: 300, y: 60 });
    expect(bumped).toMatchObject({ outcome: "wrong-target", targetId: "target-b", bumpedItemId: "item-b" });
    expect(bumped.state.placements).toEqual({ "item-a": "target-b", "item-b": null });
    expect(bumped.state.centers["item-b"]).toEqual({ x: 0.75, y: 0.8 }); // item-b's start
    // an item can be dropped back on its own previous target
    const placed = resolveDrop(challenge, layout, s0, "item-a", { x: 100, y: 60 }).state;
    expect(resolveDrop(challenge, layout, placed, "item-a", { x: 100, y: 60 }).outcome).toBe("correct");
  });

  it("allPlaced / allCorrect / buildAnswer", () => {
    let s = createInitialState(challenge);
    expect(allPlaced(challenge, s)).toBe(false);
    s = resolveDrop(challenge, layout, s, "item-a", { x: 100, y: 60 }).state;
    s = resolveDrop(challenge, layout, s, "item-b", { x: 100, y: 60 }).state; // bumps item-a back home
    expect(s.placements).toEqual({ "item-a": null, "item-b": "target-a" });
    expect(allPlaced(challenge, s)).toBe(false);
    s = resolveDrop(challenge, layout, s, "item-a", { x: 100, y: 60 }).state; // bumps item-b home again
    s = resolveDrop(challenge, layout, s, "item-b", { x: 300, y: 60 }).state;
    expect(allPlaced(challenge, s) && allCorrect(challenge, s)).toBe(true);
    expect(buildAnswer(challenge, s)).toEqual({ placements: { "item-a": "target-a", "item-b": "target-b" } });
  });

  it("a wrong placement can always be repaired: every item can be moved even when all areas are taken", () => {
    let st = createInitialState(challenge);
    st = resolveDrop(challenge, layout, st, "item-a", { x: 300, y: 60 }).state; // a on b's area
    st = resolveDrop(challenge, layout, st, "item-b", { x: 100, y: 60 }).state; // b on a's area
    expect(allCorrect(challenge, st)).toBe(false);
    expect(allPlaced(challenge, st)).toBe(true);
    st = resolveDrop(challenge, layout, st, "item-a", { x: 100, y: 60 }).state; // a home, b goes to its start
    st = resolveDrop(challenge, layout, st, "item-b", { x: 300, y: 60 }).state;
    expect(allCorrect(challenge, st)).toBe(true);
  });

  it("geometry helpers reject invalid layouts and convert round-trip", () => {
    const bad = { width: 0, height: 300 };
    expect(() => normalizedToPx({ x: 0.5, y: 0.5 }, bad)).toThrow(RangeError);
    expect(() => pxToNormalized({ x: 1, y: 1 }, bad)).toThrow(RangeError);
    expect(() => hitTarget(challenge, bad, { x: 1, y: 1 })).toThrow(RangeError);
    expect(() => clampToSurface({ x: 1, y: 1 }, bad)).toThrow(RangeError);
    const p = normalizedToPx({ x: 0.25, y: 0.8 }, layout);
    expect(p).toEqual({ x: 100, y: 240 });
    expect(pxToNormalized(p, layout)).toEqual({ x: 0.25, y: 0.8 });
    expect(clampToSurface({ x: -50, y: 999 }, layout)).toEqual({ x: 0, y: 300 });
  });

  it("an invalid layout throws RangeError instead of producing NaN", () => {
    for (const bad of [{ width: 0, height: 300 }, { width: 400, height: -1 }, { width: Number.NaN, height: 300 }]) {
      expect(() => resolveDrop(challenge, bad, createInitialState(challenge), "item-a", { x: 1, y: 1 })).toThrow(RangeError);
      expect(() => extractDragDropFeatures(challenge, session([]), { layout: bad })).toThrow(RangeError);
    }
  });
});

describe("attempts (replay of the session against the rules)", () => {
  it("one successful drag: grab offset, centers, release error, state after", () => {
    // grabbed 10px right of the center: center follows pointer minus that offset
    const events = [
      ev(0, "pointerdown", 110, 240), ev(100, "pointermove", 110, 150), ev(200, "pointerup", 112, 62),
    ];
    const { attempts, finalState } = deriveDragAttempts(challenge, layout, session(events));
    const a = attempts[0]!;
    expect(a).toMatchObject({ itemId: "item-a", outcome: "correct", targetId: "target-a", end: "up", index: 1, attemptOfItem: 1 });
    expect(a.grabOffset).toEqual({ x: 10, y: 0 });
    expect(a.centers.map((c) => [c.x, c.y])).toEqual([[100, 240], [100, 150], [102, 62]]);
    expect(a.releaseCenter).toEqual({ x: 102, y: 62 });
    expect(a.releaseError).toBeCloseTo(Math.hypot(2, 2));
    expect(finalState.placements["item-a"]).toBe("target-a");
  });

  it("failed drop (miss) returns the item; the next attempt grabs it from its ORIGINAL position", () => {
    const events = [
      ...drag("item-a", 0, { x: 200, y: 150 }),
      // second drag: grabbed at the start center again (the item went back)
      ...drag("item-a", 1000, { x: 100, y: 60 }),
    ];
    const { attempts } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts.map((a) => [a.outcome, a.attemptOfItem])).toEqual([["miss", 1], ["correct", 2]]);
    expect(attempts[1]!.grabOffset).toEqual({ x: 0, y: 0 });
  });

  it("wrong-target drop leaves the item on that target; re-dragging it grabs from the target center", () => {
    const events = [
      ...drag("item-a", 0, { x: 300, y: 60 }), // onto target-b (wrong)
      ev(1000, "pointerdown", 305, 60), ev(1100, "pointermove", 200, 60), ev(1200, "pointerup", 100, 62), // grabbed 5px off the snapped center
    ];
    const { attempts } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts[0]).toMatchObject({ outcome: "wrong-target", targetId: "target-b" });
    expect(attempts[1]!.grabOffset).toEqual({ x: 5, y: 0 });
    expect(attempts[1]).toMatchObject({ outcome: "correct", targetId: "target-a" });
  });

  it("cancelled, interrupted and unreleased attempts are cancelled and change nothing", () => {
    const events = [
      ...drag("item-a", 0, { x: 100, y: 60 }, { cancel: true }),
      ev(500, "pointerdown", 100, 240), ev(550, "pointerdown", 100, 240), ev(600, "pointermove", 100, 200), // interrupted by a second press
      ev(2000, "pointerdown", 300, 240, { item: "item-b", id: 2 }), // never released
    ];
    const { attempts, finalState } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts.map((a) => [a.outcome, a.end])).toEqual([["cancelled", "cancel"], ["cancelled", "interrupted"], ["cancelled", "open"], ["cancelled", "open"]].slice(0, attempts.length));
    expect(attempts.every((a) => a.outcome === "cancelled" && a.releaseCenter === null && a.releaseError === null)).toBe(true);
    expect(Object.values(finalState.placements)).toEqual([null, null]);
  });

  it("ignores events on other targets, unknown items and the surface", () => {
    const events = [
      ev(0, "pointerdown", 100, 240, { target: "drag-surface" }), ev(10, "pointerup", 100, 240, { target: "drag-surface" }),
      ev(20, "pointerdown", 100, 240, { target: "drag-item:ghost" }), ev(30, "pointerup", 100, 60, { target: "drag-item:ghost" }),
      ev(40, "pointerdown", 100, 240, { target: "slider-handle" }), ev(50, "pointerup", 100, 240, { target: "slider-handle" }),
    ];
    expect(deriveDragAttempts(challenge, layout, session(events)).attempts).toEqual([]);
  });

  it("overlapping drags are not replayed out of order: the later-starting one is ignored (cancelled)", () => {
    const events = [
      ev(0, "pointerdown", 100, 240, { item: "item-a", id: 1 }),
      ev(100, "pointerdown", 300, 240, { item: "item-b", id: 2 }), // starts while item-a is still held
      ev(200, "pointerup", 300, 60, { item: "item-b", id: 2 }),
      ev(1000, "pointerup", 100, 60, { item: "item-a", id: 1 }),
    ];
    const { attempts, finalState } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts.map((a) => [a.itemId, a.outcome, a.overlapped])).toEqual([["item-a", "correct", false], ["item-b", "cancelled", true]]);
    expect(finalState.placements).toEqual({ "item-a": "target-a", "item-b": null });
    const f = extractDragDropFeatures(challenge, session(events), { layout }).features;
    expect(f).toMatchObject({ successfulDropCount: 1, cancelledDragCount: 1, timeToAllCorrect: null, numberOfDragAttempts: 2 });
  });

  it("an unfinished drag blocks every later attempt (it never ends)", () => {
    const events = [
      ev(0, "pointerdown", 100, 240, { item: "item-a", id: 1 }), ev(50, "pointermove", 100, 200, { item: "item-a", id: 1 }), // never released
      ev(1000, "pointerdown", 300, 240, { item: "item-b", id: 2 }), ev(1100, "pointerup", 300, 60, { item: "item-b", id: 2 }),
    ];
    const { attempts, finalState } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts.map((a) => [a.itemId, a.outcome, a.overlapped])).toEqual([["item-a", "cancelled", false], ["item-b", "cancelled", true]]);
    expect(Object.values(finalState.placements)).toEqual([null, null]);
  });

  it("the shared grab-offset and held-center helpers agree with the replay of a drag", () => {
    const off = grabOffsetOf({ x: 100, y: 240 }, { x: 112, y: 236 });
    expect(off).toEqual({ x: 12, y: -4 });
    expect(heldCenterOf({ x: 212, y: 136 }, off, layout)).toEqual({ x: 200, y: 140 });
    expect(heldCenterOf({ x: -900, y: 999 }, off, layout)).toEqual({ x: 0, y: 300 });
    const { attempts } = deriveDragAttempts(challenge, layout, session([ev(0, "pointerdown", 112, 236), ev(10, "pointermove", 212, 136), ev(20, "pointerup", 112, 62)]));
    expect(attempts[0]!.centers[1]).toMatchObject({ x: 200, y: 140 });
  });

  it("keeps mouse id 1 and touch id 1 apart when they take turns", () => {
    const events = [
      ev(0, "pointerdown", 100, 240, { item: "item-a", id: 1 }),
      ev(50, "pointerup", 100, 60, { item: "item-a", id: 1 }),
      ev(100, "pointerdown", 300, 240, { item: "item-b", id: 1, pointerType: "touch" }),
      ev(160, "pointerup", 300, 60, { item: "item-b", id: 1, pointerType: "touch" }),
    ];
    const { attempts } = deriveDragAttempts(challenge, layout, session(events));
    expect(attempts.map((a) => [a.itemId, a.pointerType, a.outcome])).toEqual([
      ["item-a", "mouse", "correct"], ["item-b", "touch", "correct"],
    ]);
  });
});

describe("drag & drop features", () => {
  const a = (t: number, to: { x: number; y: number }) => drag("item-a", t, to);
  const b = (t: number, to: { x: number; y: number }) => drag("item-b", t, to);

  it("clean run: both items placed right", () => {
    const f = features([...a(100, { x: 100, y: 60 }), ...b(800, { x: 310, y: 60 })]);
    expect(f).toMatchObject({
      reactionTime: 100, timeToAllCorrect: 1000, numberOfDragAttempts: 2,
      successfulDropCount: 2, failedDropCount: 0, cancelledDragCount: 0,
      totalDragDuration: 400, meanDragDuration: 200, inputModality: "mouse", eventCount: 6, completionTime: 1000,
    });
    expect(f.meanReleaseError).toBeCloseTo(5); // (0 + 10) / 2
    expect(f.maxReleaseError).toBe(10);
    // path: (100,240)->(100,150)->(100,60) = 180; (300,240)->(305,150)->(310,60) ~ 180.1
    expect(f.totalDragDistance).toBeCloseTo(180 + 2 * Math.hypot(5, 90));
    expect(f.meanDragDistance).toBeCloseTo((180 + 2 * Math.hypot(5, 90)) / 2);
    expect(f.directionChanges).toBe(0);
  });

  it("failed vs cancelled are counted separately; success after failure; timeToAllCorrect is the LAST fixing release", () => {
    const f = features([
      ...a(0, { x: 200, y: 150 }), // miss
      ...b(400, { x: 100, y: 60 }), // wrong target (target-a); item-b now rests at (100, 60)
      ...a(800, { x: 100, y: 60 }), // item-a takes target-a (correct) and sends item-b back to (300, 240)
      ...drag("item-a", 1200, { x: 100, y: 60 }, { cancel: true, from: { x: 100, y: 60 } }), // cancelled
      ...drag("item-b", 1600, { x: 300, y: 60 }), // item-b from its start to its own target: correct
    ]);
    expect(f).toMatchObject({
      numberOfDragAttempts: 5, successfulDropCount: 2, failedDropCount: 2, cancelledDragCount: 1, timeToAllCorrect: 1800,
    });
  });

  it("an all-correct state that is later broken (and not repaired) has no completion time", () => {
    const f = features([
      ...a(0, { x: 100, y: 60 }), ...b(400, { x: 300, y: 60 }),
      ...drag("item-a", 800, { x: 300, y: 60 }, { from: { x: 100, y: 60 } }), // a takes b's area: wrong, b goes home
    ]);
    expect(f.timeToAllCorrect).toBeNull();
    expect(f).toMatchObject({ successfulDropCount: 2, failedDropCount: 1 });
    // ...and repaired: the completion time is the repairing release, not the first all-correct moment.
    const repaired = features([
      ...a(0, { x: 100, y: 60 }), ...b(400, { x: 300, y: 60 }),
      ...drag("item-a", 800, { x: 300, y: 60 }, { from: { x: 100, y: 60 } }),
      ...drag("item-a", 1200, { x: 100, y: 60 }, { from: { x: 300, y: 60 } }),
      ...drag("item-b", 1600, { x: 300, y: 60 }),
    ]);
    expect(repaired.timeToAllCorrect).toBe(1800);
    const none = features([...a(0, { x: 100, y: 60 })]);
    expect(none.timeToAllCorrect).toBeNull(); // item-b never placed
  });

  it("no attempts: null aggregates, zero counts, never NaN", () => {
    const f = features([], 0);
    expect(f).toMatchObject({
      reactionTime: null, timeToAllCorrect: null, numberOfDragAttempts: 0, successfulDropCount: 0, failedDropCount: 0,
      cancelledDragCount: 0, totalDragDuration: null, meanDragDuration: null, totalDragDistance: null, meanDragDistance: null,
      meanReleaseError: null, maxReleaseError: null, directionChanges: 0, inputModality: "none",
    });
  });

  it("only cancelled attempts: counted, but no durations, distances or release errors", () => {
    const f = features([...drag("item-a", 0, { x: 100, y: 60 }, { cancel: true })]);
    expect(f).toMatchObject({ numberOfDragAttempts: 1, cancelledDragCount: 1, failedDropCount: 0, totalDragDuration: null, meanReleaseError: null, reactionTime: 0 });
  });

  it("duplicate timestamps stay finite", () => {
    const f = features([ev(10, "pointerdown", 100, 240), ev(10, "pointermove", 100, 150), ev(10, "pointerup", 100, 60)]);
    expect(f).toMatchObject({ successfulDropCount: 1, totalDragDuration: 0, meanDragDuration: 0 });
    expect(Object.values(f).every((v) => v === null || typeof v === "string" || Number.isFinite(v))).toBe(true);
  });

  it("touch and mixed pointer types are reported through the session modality", () => {
    expect(features(drag("item-a", 0, { x: 100, y: 60 }, { pointerType: "touch" })).inputModality).toBe("touch");
    const mixed = features([...drag("item-a", 0, { x: 100, y: 60 }), ...drag("item-b", 500, { x: 300, y: 60 }, { pointerType: "pen" })]);
    expect(mixed.inputModality).toBe("mixed");
  });

  it("counts direction changes with the core definition (zig-zag drag)", () => {
    const f = features([
      ev(0, "pointerdown", 100, 240), ev(50, "pointermove", 200, 240), ev(100, "pointermove", 200, 140),
      ev(150, "pointermove", 100, 140), ev(200, "pointerup", 100, 60),
    ]);
    expect(f.directionChanges).toBe(3);
  });

  it("is a context-requiring plugin: geometry decides release error", () => {
    // On an 800x600 surface item-a starts at (200, 480) and target-a is centered at (200, 120).
    const events = drag("item-a", 0, { x: 210, y: 125 }, { from: { x: 200, y: 480 } });
    const big = extractDragDropFeatures(challenge, session(events), { layout: { width: 800, height: 600 } }).features;
    expect(big.meanReleaseError).toBeCloseTo(Math.hypot(10, 5));
    expect(big.successfulDropCount).toBe(1); // radius 0.14 * 600 = 84px: a drop 11px away is inside
    // The same events judged on the small layout are a different drag (grab offset differs): geometry matters.
    const small = extractDragDropFeatures(challenge, session(events), { layout }).features;
    expect(small.meanReleaseError).not.toBeCloseTo(Math.hypot(10, 5));
  });
});

describe("golden: definitions must not change silently", () => {
  const events = [
    ...drag("item-a", 100, { x: 200, y: 150 }), // miss, error hypot(100,90)
    ...drag("item-a", 500, { x: 104, y: 60 }), // correct, error 4
    ...drag("item-b", 900, { x: 300, y: 60 }, { cancel: true }), // cancelled
    ...drag("item-b", 1300, { x: 300, y: 63 }), // correct, error 3
  ];
  const set = extractDragDropFeatures(challenge, session(events), { layout });
  it("pins versions and values", () => {
    expect(set.schemaVersion).toBe("drag-drop@1;motion@1");
    expect(set.extractorVersion).toBe("drag-drop@1;motion@1");
    expect(set.features).toMatchInlineSnapshot(`
      {
        "cancelledDragCount": 1,
        "completionTime": 1500,
        "directionChanges": 0,
        "eventCount": 12,
        "failedDropCount": 1,
        "inputModality": "mouse",
        "maxReleaseError": 134.5362404707371,
        "meanDragDistance": 163.86022647652248,
        "meanDragDuration": 200,
        "meanReleaseError": 47.17874682357904,
        "numberOfDragAttempts": 4,
        "reactionTime": 100,
        "successfulDropCount": 2,
        "timeToAllCorrect": 1500,
        "totalDragDistance": 491.58067942956745,
        "totalDragDuration": 600,
      }
    `);
  });
});
