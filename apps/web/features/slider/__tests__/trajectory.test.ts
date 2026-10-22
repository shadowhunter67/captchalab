import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import type { SliderChallenge, SliderLayout } from "@captchalab/captcha-plugins";
import { buildTrajectory } from "../trajectory";

const layout: SliderLayout = { trackLeft: 0, trackWidth: 340, handleWidth: 40 };
const challenge: SliderChallenge = { id: "c", target: 0.5, tolerance: 0.1 };

const ev = (t: number, type: "pointerdown" | "pointermove" | "pointerup", x: number, y = 10): InteractionEvent => ({
  t, type, x, y, pointerId: 1, pointerType: "mouse",
});
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "slider", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: "mouse",
});

describe("buildTrajectory", () => {
  it("maps events to a path, markers and span without mutating the session", () => {
    const s = session([ev(10, "pointerdown", 20), ev(60, "pointermove", 100, 30), ev(110, "pointerup", 170, 12)]);
    const before = JSON.stringify(s);
    const t = buildTrajectory(s, layout, challenge, 64);
    expect(t.paths).toEqual(["M20.00 10.00 L100.00 30.00 L170.00 12.00"]);
    expect(t.start).toEqual({ x: 20, y: 10 });
    expect(t.end).toEqual({ x: 170, y: 12 });
    expect(t.span).toEqual({ startT: 10, endT: 110 });
    expect(JSON.stringify(s)).toBe(before);
  });

  it("places the target region around the handle center for the target", () => {
    const t = buildTrajectory(session([]), layout, challenge, 64);
    // center = 20 + 0.5 * 300 = 170; half = 0.1 * 300 = 30
    expect(t.targetRegion).toEqual({ x: 140, y: 0, width: 60, height: 64 });
  });

  it("does not join separate attempts and expands the viewBox to out-of-track samples", () => {
    const s = session([
      ev(0, "pointerdown", 20), ev(10, "pointerup", 100),
      ev(500, "pointerdown", 20), ev(510, "pointermove", 120, 200), ev(520, "pointerup", 130, 200),
    ]);
    const t = buildTrajectory(s, layout, challenge, 64);
    expect(t.paths).toHaveLength(2);
    expect(t.viewBox.y + t.viewBox.height).toBeGreaterThanOrEqual(200);
  });

  it("handles a session with no pointer data", () => {
    const t = buildTrajectory(session([]), layout, challenge, 64);
    expect(t.paths).toEqual([]);
    expect(t.span).toBeNull();
    expect(t.start).toBeNull();
  });

  it("throws RangeError for an invalid layout instead of drawing garbage", () => {
    expect(() => buildTrajectory(session([]), { ...layout, trackWidth: 10 }, challenge, 64)).toThrow(RangeError);
  });
});
