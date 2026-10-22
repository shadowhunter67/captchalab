import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  buildMotionSeries,
  extractGestures,
  extractMotionFeatures,
  gestureTrack,
  inferModality,
  sessionMotionSeries,
  type InteractionEvent,
  type InteractionSession,
} from "../index";

type Kind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "touchstart" | "touchmove" | "touchend";
const ev = (
  t: number,
  type: Kind,
  x: number,
  o: { id?: number; pointerType?: "mouse" | "touch" | "pen" } = {},
): InteractionEvent => ({ t, type, x, y: 0, pointerId: o.id ?? 1, pointerType: o.pointerType ?? "mouse" });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "t", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});
const pts = (arr: [number, number][]) => arr.map(([t, x]) => ({ t, x, y: 0 }));

describe("motion series", () => {
  it("constant velocity: samples at segment midpoints, zero acceleration", () => {
    const s = buildMotionSeries([pts([[0, 0], [100, 10], [200, 20], [300, 30]])]);
    expect(s.segments[0]?.velocity).toEqual([
      { t: 50, value: 100 }, { t: 150, value: 100 }, { t: 250, value: 100 },
    ]);
    expect(s.segments[0]?.acceleration).toEqual([{ t: 100, value: 0 }, { t: 200, value: 0 }]);
  });

  it("changing velocity: positive then negative acceleration with correct units and times", () => {
    // speeds: 100 px/s (0-100ms), 300 px/s (100-200ms), 100 px/s (200-300ms)
    const s = buildMotionSeries([pts([[0, 0], [100, 10], [200, 40], [300, 50]])]);
    expect(s.segments[0]?.velocity.map((v) => v.value)).toEqual([100, 300, 100]);
    expect(s.segments[0]?.acceleration).toEqual([
      { t: 100, value: 2000 }, // (300-100)/100ms*1000, centred between midpoints 50 and 150
      { t: 200, value: -2000 },
    ]);
  });

  it("irregular sampling divides by the midpoint spacing", () => {
    // v1 = 100 px/s at tMid 50; v2 = 200 px/s over 100-400ms at tMid 250
    const s = buildMotionSeries([pts([[0, 0], [100, 10], [400, 70]])]);
    expect(s.segments[0]?.acceleration).toEqual([{ t: 150, value: ((200 - 100) / 200) * 1000 }]);
  });

  it("duplicate timestamps, one point and zero points never produce NaN or samples", () => {
    expect(buildMotionSeries([pts([[10, 0], [10, 5]])]).segments[0]?.velocity).toEqual([]);
    expect(buildMotionSeries([pts([[10, 0]])]).segments[0]).toEqual({ velocity: [], acceleration: [] });
    expect(buildMotionSeries([[]]).segments[0]).toEqual({ velocity: [], acceleration: [] });
    expect(buildMotionSeries([]).segments).toEqual([]);
    expect(sessionMotionSeries(session([])).segments).toEqual([]);
  });

  it("three points give 2 velocity + 1 acceleration; two points give 1 velocity and no acceleration", () => {
    const seg = buildMotionSeries([pts([[0, 0], [100, 10], [200, 30]])]).segments[0];
    expect(seg?.velocity).toHaveLength(2);
    expect(seg?.acceleration).toHaveLength(1);
    const two = buildMotionSeries([pts([[0, 0], [100, 10]])]).segments[0];
    expect(two?.velocity).toHaveLength(1);
    expect(two?.acceleration).toEqual([]);
  });
});

describe("session series respect gesture boundaries", () => {
  it("never joins two attempts (retry), no giant speed across the gap", () => {
    const s = sessionMotionSeries(session([
      ev(0, "pointerdown", 0), ev(100, "pointermove", 10), ev(200, "pointerup", 20),
      ev(5000, "pointerdown", 0), ev(5100, "pointermove", 10), ev(5200, "pointerup", 20),
    ]));
    expect(s.segments).toHaveLength(2);
    const all = s.segments.flatMap((g) => g.velocity.map((v) => v.value));
    expect(Math.max(...all)).toBe(100);
  });

  it("pointercancel ends a segment", () => {
    const s = sessionMotionSeries(session([
      ev(0, "pointerdown", 0), ev(100, "pointermove", 10), ev(200, "pointercancel", 20),
      ev(300, "pointerdown", 500), ev(400, "pointermove", 510),
    ]));
    expect(s.segments).toHaveLength(2);
    expect(s.segments.flatMap((g) => g.velocity.map((v) => v.value))).toEqual([100, 100, 100]);
  });

  it("separates interleaved pointer ids and mouse vs touch ids", () => {
    const s = sessionMotionSeries(session([
      ev(0, "pointerdown", 0, { id: 1 }), ev(10, "pointerdown", 1000, { id: 2 }),
      ev(100, "pointermove", 10, { id: 1 }), ev(110, "pointermove", 1010, { id: 2 }),
      ev(200, "pointerup", 20, { id: 1 }), ev(210, "pointerup", 1020, { id: 2 }),
    ]));
    expect(s.segments).toHaveLength(2);
    for (const seg of s.segments) expect(Math.max(...seg.velocity.map((v) => v.value))).toBeCloseTo(100);

    const fam = sessionMotionSeries(session([
      ev(0, "pointerdown", 0, { id: 1, pointerType: "touch" }),
      ev(0, "touchstart", 900, { id: 1, pointerType: "touch" }), // other id space (touch family)
      ev(100, "pointermove", 10, { id: 1, pointerType: "touch" }),
      ev(100, "touchmove", 910, { id: 1, pointerType: "touch" }),
    ]));
    expect(fam.segments).toHaveLength(2);
  });

  it("agrees with the aggregate features (max velocity / max |acceleration|)", () => {
    const sess = session([
      ev(0, "pointerdown", 0), ev(50, "pointermove", 20), ev(120, "pointermove", 30),
      ev(300, "pointermove", 200), ev(340, "pointerup", 210),
    ]);
    const f = extractMotionFeatures(sess);
    const series = sessionMotionSeries(sess);
    const vmax = Math.max(...series.segments.flatMap((g) => g.velocity.map((v) => v.value)));
    const amax = Math.max(...series.segments.flatMap((g) => g.acceleration.map((a) => Math.abs(a.value))));
    expect(vmax).toBeCloseTo(f.maxVelocity);
    expect(amax).toBeCloseTo(f.maxAcceleration);
  });

  it("variance of the series equals velocityVariance", () => {
    const sess = session([
      ev(0, "pointerdown", 0), ev(50, "pointermove", 20), ev(120, "pointermove", 30),
      ev(300, "pointermove", 200), ev(340, "pointerup", 210),
    ]);
    const v = sessionMotionSeries(sess).segments.flatMap((g) => g.velocity.map((x) => x.value));
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length;
    expect(variance).toBeCloseTo(extractMotionFeatures(sess).velocityVariance);
  });

  it("empty and one-sample sessions give finite zero aggregates", () => {
    for (const evs of [[], [ev(5, "pointermove", 3)]]) {
      const f = extractMotionFeatures(session(evs));
      expect([f.maxVelocity, f.maxAcceleration, f.velocityVariance, f.meanVelocity]).toEqual([0, 0, 0, 0]);
    }
  });

  it("a new press without an up/cancel closes the previous track (no velocity or acceleration across it)", () => {
    const evs = [
      ev(0, "pointerdown", 0), ev(100, "pointermove", 10), ev(200, "pointermove", 20),
      ev(300, "pointerdown", 900), ev(400, "pointermove", 910), ev(500, "pointermove", 920),
    ];
    const s = sessionMotionSeries(session(evs));
    expect(s.segments).toHaveLength(2);
    expect(s.segments.flatMap((g) => g.acceleration)).toHaveLength(2);
    expect(Math.max(...s.segments.flatMap((g) => g.velocity.map((v) => v.value)))).toBe(100);
  });

  it("duplicate timestamps in a session collapse consistently across series and aggregates", () => {
    const evs = [
      ev(0, "pointerdown", 0), ev(100, "pointermove", 10), ev(100, "pointermove", 12), ev(200, "pointermove", 32),
      ev(200, "pointerup", 30),
    ];
    const sess = session(evs);
    const f = extractMotionFeatures(sess);
    const seg = sessionMotionSeries(sess).segments[0];
    expect(seg?.velocity.map((v) => v.value)).toEqual([120, 180]); // 0->12 in 100ms, 12->30 in 100ms
    expect(f.pointerDistance).toBe(30);
    expect(f.maxVelocity).toBe(180);
    expect(seg?.acceleration).toEqual([{ t: 100, value: 600 }]);
    expect(f.maxAcceleration).toBe(600);
  });

  it("gestureTrack matches the track rules (drag only, collapsed timestamps, no click)", () => {
    const sess = session([
      ev(0, "pointermove", 0), // hover: not in the gesture
      ev(10, "pointerdown", 5), ev(10, "pointermove", 6), ev(50, "pointerup", 9),
    ]);
    const [g] = extractGestures(sess);
    expect(gestureTrack(g?.events ?? [])).toEqual([{ t: 10, x: 6, y: 0 }, { t: 50, x: 9, y: 0 }]);
  });
});
