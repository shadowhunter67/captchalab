import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  accelerations,
  countDirectionChanges,
  createEventRecorder,
  extractGestures,
  createPointerTimeline,
  createRng,
  extractBaseFeatures,
  extractMotionFeatures,
  inferModality,
  pathLength,
  segmentSpeeds,
  pointerTracks,
  type InteractionEvent,
  type InteractionSession,
} from "../index";

function session(events: InteractionEvent[], durationMs?: number): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "s",
    captchaId: "test",
    startedAt: 0,
    durationMs: durationMs ?? events[events.length - 1]?.t ?? 0,
    events,
    inputModality: inferModality(events),
  };
}

const move = (t: number, x: number, y: number): InteractionEvent => ({
  t,
  type: "pointermove",
  x,
  y,
  pointerId: 1, pointerType: "mouse",
});

describe("geometry", () => {
  it("pathLength handles 0, 1, repeated and 3-4-5 points", () => {
    expect(pathLength([])).toBe(0);
    expect(pathLength([{ x: 1, y: 1 }])).toBe(0);
    expect(pathLength([{ x: 1, y: 1 }, { x: 1, y: 1 }])).toBe(0);
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 4 }, { x: 6, y: 8 }])).toBe(10);
  });

  it("countDirectionChanges ignores straight lines and repeated points, counts sharp turns", () => {
    const straight = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }];
    expect(countDirectionChanges(straight)).toBe(0);
    const zigzag = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(countDirectionChanges(zigzag)).toBe(2);
    expect(countDirectionChanges([{ x: 0, y: 0 }])).toBe(0);
  });

  it("wraps heading difference across +-pi", () => {
    // Heading ~+179deg to ~-179deg is a 2deg turn, not 358deg.
    const pts = [{ x: 0, y: 0 }, { x: -10, y: 0.17 }, { x: -20, y: -0.17 }];
    expect(countDirectionChanges(pts)).toBe(0);
  });
});

describe("speed and acceleration", () => {
  it("computes px/s from a constant-speed fixture", () => {
    const pts = [0, 100, 200].map((t) => ({ t, x: t / 10, y: 0 })); // 10px per 100ms
    expect(segmentSpeeds(pts).map((s) => s.v)).toEqual([100, 100]);
    expect(accelerations(segmentSpeeds(pts)).map((a) => a.a)).toEqual([0]);
  });

  it("skips repeated timestamps instead of dividing by zero", () => {
    const pts = [
      { t: 0, x: 0, y: 0 },
      { t: 0, x: 5, y: 0 },
      { t: 100, x: 15, y: 0 },
    ];
    const speeds = segmentSpeeds(pts);
    expect(speeds).toHaveLength(1);
    // collapsed tracks keep distance consistent with speed: 10px over 100ms
    const f = extractMotionFeatures(session(pts.map((p) => move(p.t, p.x, p.y))));
    expect(f.meanVelocity).toBe(f.maxVelocity);
    expect(Number.isFinite(speeds[0]?.v)).toBe(true);
  });

  it("computes signed acceleration", () => {
    const speeds = [{ t: 0, tMid: 0, v: 0 }, { t: 500, tMid: 500, v: 100 }];
    expect(accelerations(speeds)).toEqual([{ t: 500, a: 200 }]);
  });
});

describe("extractMotionFeatures", () => {
  it("zero events yields nulls and zeros, never NaN", () => {
    const f = extractMotionFeatures(session([], 0));
    expect(f.reactionTime).toBeNull();
    expect(f.timeToFirstClick).toBeNull();
    expect(f.meanVelocity).toBe(0);
    expect(f.pointerDistance).toBe(0);
    expect(Object.values(f).every((v) => v === null || Number.isFinite(v))).toBe(true);
  });

  it("single event has reaction time but no movement", () => {
    const f = extractMotionFeatures(session([move(40, 5, 5)]));
    expect(f.reactionTime).toBe(40);
    expect(f.movementDuration).toBe(0);
    expect(f.meanVelocity).toBe(0);
  });

  it("meanVelocity = distance / movementDuration in px/s", () => {
    const f = extractMotionFeatures(session([move(100, 0, 0), move(600, 300, 400)]));
    expect(f.pointerDistance).toBe(500);
    expect(f.movementDuration).toBe(500);
    expect(f.meanVelocity).toBe(1000);
    expect(f.maxVelocity).toBe(1000);
  });

  it("measures click timing and inter-click gaps from pointerdown", () => {
    const down = (t: number): InteractionEvent => ({ t, type: "pointerdown", x: 0, y: 0, pointerId: 1, pointerType: "touch" });
    const f = extractMotionFeatures(session([move(10, 0, 0), down(100), down(300), down(700)]));
    expect(f.timeToFirstClick).toBe(100);
    expect(f.interClickTime).toBe(300);
  });

  it("does not join separate gestures or count click as movement", () => {
    const e = (t: number, type: "pointerdown" | "pointerup" | "click", x: number): InteractionEvent => ({
      t, type, x, y: 0, pointerId: 1, pointerType: "mouse",
    });
    const events = [e(0, "pointerdown", 0), e(100, "pointerup", 10), e(110, "click", 10), e(5000, "pointerdown", 500), e(5100, "pointerup", 510)];
    expect(pointerTracks(session(events))).toHaveLength(2);
    const f = extractMotionFeatures(session(events));
    expect(f.pointerDistance).toBe(20);
    expect(f.movementDuration).toBe(200);
  });

  it("keyboard-only sessions have no motion", () => {
    const kb: InteractionEvent[] = [
      { t: 120, type: "keydown", code: "KeyA" },
      { t: 180, type: "keyup", code: "KeyA" },
    ];
    const s = session(kb);
    const f = extractMotionFeatures(s);
    expect(s.inputModality).toBe("keyboard");
    expect(f.reactionTime).toBe(120);
    expect(f.pointerDistance).toBe(0);
  });

  it("base features come from the session", () => {
    expect(extractBaseFeatures(session([move(10, 0, 0), move(20, 1, 1)], 900))).toEqual({
      completionTime: 900,
      eventCount: 2,
    });
  });
});

describe("recorder", () => {
  function clock(values: number[]) {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)] as number;
  }

  it("stamps relative monotonic time and finishes into a versioned session", () => {
    const r = createEventRecorder({ captchaId: "slider", now: clock([1000, 1010, 1050, 1100]), idFactory: () => "id1" });
    r.record({ type: "pointerdown", x: 1, y: 2, pointerId: 1, pointerType: "mouse" });
    r.record({ type: "pointerup", x: 3, y: 4, pointerId: 1, pointerType: "mouse" });
    const s = r.finish();
    expect(s.events.map((e) => e.t)).toEqual([10, 50]);
    expect(s.durationMs).toBe(100);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.inputModality).toBe("mouse");
    expect(s.id).toBe("id1");
  });

  it("throttles moves, caps the buffer and counts drops", () => {
    const times = [0, 1, 2, 3, 20, 21, 22, 23, 24];
    const r = createEventRecorder({ captchaId: "x", now: clock(times), minMoveIntervalMs: 10, maxEvents: 2 });
    for (let i = 0; i < 6; i++) r.record({ type: "pointermove", x: i, y: 0, pointerId: 1, pointerType: "mouse" });
    expect(r.size).toBe(2);
    expect(r.dropped).toBe(4);
  });

  it("clamps a backwards clock, rejects non-finite input, and empty session is none", () => {
    const r = createEventRecorder({ captchaId: "x", now: clock([100, 150, 120, 130, 200]) });
    r.record({ type: "pointermove", x: 0, y: 0, pointerId: 1, pointerType: "mouse" });
    r.record({ type: "pointermove", x: 1, y: 0, pointerId: 1, pointerType: "mouse" });
    r.record({ type: "pointermove", x: Number.NaN, y: 0, pointerId: 1, pointerType: "mouse" });
    const s = r.finish();
    expect(s.events.map((e) => e.t)).toEqual([50, 50]);
    expect(r.dropped).toBe(1);
    expect(inferModality([])).toBe("none");
  });

  it("ignores events after finish and reports mixed modality", () => {
    const r = createEventRecorder({ captchaId: "x", now: clock([0, 1, 2, 3, 4]) });
    r.record({ type: "pointerdown", x: 0, y: 0, pointerId: 1, pointerType: "mouse" });
    r.record({ type: "keydown", code: "Tab" });
    const s = r.finish();
    r.record({ type: "keyup", code: "Tab" });
    expect(s.events).toHaveLength(2);
    expect(s.inputModality).toBe("mixed");
  });
});

describe("pointer timeline", () => {
  const s = session([
    { t: 0, type: "pointerdown", x: 0, y: 0, pointerId: 1, pointerType: "mouse" },
    move(100, 100, 0),
    { t: 200, type: "pointerup", x: 100, y: 50, pointerId: 1, pointerType: "mouse" },
  ]);
  const tl = createPointerTimeline(s);

  it("interpolates and clamps", () => {
    expect(tl.at(-50)).toEqual({ x: 0, y: 0, down: true });
    expect(tl.at(50)).toEqual({ x: 50, y: 0, down: true });
    expect(tl.at(150)).toEqual({ x: 100, y: 25, down: true });
    expect(tl.at(999)).toEqual({ x: 100, y: 50, down: false });
  });

  it("returns null with no pointer samples and survives duplicate timestamps", () => {
    expect(createPointerTimeline(session([{ t: 5, type: "keydown", code: "A" }])).at(5)).toBeNull();
    const dup = createPointerTimeline(session([move(10, 0, 0), move(10, 4, 4), move(20, 8, 8)]));
    const p = dup.at(10);
    expect(p && Number.isFinite(p.x)).toBe(true);
  });
});

describe("rng", () => {
  it("is deterministic and in [0,1)", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seq = Array.from({ length: 5 }, () => a());
    expect(seq).toEqual(Array.from({ length: 5 }, () => b()));
    expect(seq.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("gestures and pointer identity", () => {
  const ev = (
    t: number, type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    pointerId: number, x: number, target?: string,
  ): InteractionEvent => ({ t, type, x, y: 0, pointerId, pointerType: "touch", ...(target ? { target } : {}) });

  it("keeps interleaved pointers separate", () => {
    const events = [
      ev(0, "pointerdown", 1, 0, "a"), ev(10, "pointerdown", 2, 500, "b"),
      ev(20, "pointermove", 1, 10), ev(30, "pointerup", 2, 500), ev(40, "pointerup", 1, 20),
    ];
    const g = extractGestures(session(events));
    expect(g.map((x) => [x.pointerId, x.target, x.endedBy, x.startT, x.endT])).toEqual([
      [1, "a", "up", 0, 40],
      [2, "b", "up", 10, 30],
    ]);
    // pointer 2's up must not end pointer 1: distance 20, not mixed with pointer 2's 500.
    expect(extractMotionFeatures(session(events)).pointerDistance).toBe(20);
  });

  it("handles cancel, interrupted, open, and ignores hover before down", () => {
    const events = [
      ev(0, "pointermove", 1, 99), // hover: not a gesture
      ev(5, "pointerdown", 1, 0), ev(15, "pointercancel", 1, 3),
      ev(20, "pointerdown", 1, 0), ev(30, "pointerdown", 1, 7), // 2nd down w/o up
    ];
    const g = extractGestures(session(events));
    expect(g.map((x) => x.endedBy)).toEqual(["cancel", "interrupted", "open"]);
  });

  it("a new press without an up does not join attempts in motion tracks", () => {
    const events = [
      ev(0, "pointerdown", 1, 0), ev(10, "pointermove", 1, 5),
      ev(20, "pointerdown", 1, 100), ev(30, "pointerup", 1, 110),
    ];
    const tracks = pointerTracks(session(events));
    expect(tracks).toHaveLength(2);
    const f = extractMotionFeatures(session(events));
    expect(f.pointerDistance).toBe(15);
    expect(f.movementDuration).toBe(20);
  });

  it("does not mix touch-family and pointer-family ids or different pointer types", () => {
    const mk = (t: number, type: "pointerdown" | "touchstart", pointerType: "mouse" | "touch"): InteractionEvent => ({
      t, type, x: t, y: 0, pointerId: 1, pointerType,
    });
    const g = extractGestures(session([mk(0, "pointerdown", "mouse"), mk(10, "touchstart", "touch"), mk(20, "pointerdown", "touch")]));
    expect(g).toHaveLength(3);
    expect(g.every((x) => x.endedBy === "open")).toBe(true);
  });

  it("includes hover approach in the track (documented behavior)", () => {
    const events = [ev(0, "pointermove", 1, 0), ev(100, "pointerdown", 1, 100), ev(200, "pointerup", 1, 110)];
    const f = extractMotionFeatures(session(events));
    expect(f.pointerDistance).toBe(110);
    expect(f.movementDuration).toBe(200);
  });
});
