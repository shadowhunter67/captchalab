import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import type { SliderChallenge, SliderFeatures, SliderLayout } from "@captchalab/captcha-plugins";
import { formatMetricValue } from "@/lib/inspect/metrics";
import {
  buildSliderTrajectory,
  sliderAttemptMetrics,
  sliderDragDomain,
  sliderMotionSeries,
} from "../slider-view-data";

const layout: SliderLayout = { trackLeft: 0, trackWidth: 340, handleWidth: 40 };
const challenge: SliderChallenge = { id: "c", target: 0.5, tolerance: 0.1 };
const H = "slider-handle";
const T = "slider-track";
const ev = (
  t: number,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  target = H,
  y = 10,
): InteractionEvent => ({ t, type, x, y, pointerId: 1, pointerType: "mouse", target });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "slider", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: "mouse",
});

describe("slider trajectory (selector over the generic geometry)", () => {
  it("includes hover and drags as separate paths, plus the track and target region", () => {
    const s = session([
      ev(0, "pointermove", 5, T), ev(50, "pointermove", 15, T),
      ev(60, "pointerdown", 20), ev(100, "pointermove", 100, H, 30), ev(150, "pointerup", 170),
    ]);
    const v = buildSliderTrajectory(s, layout, challenge, 64);
    expect(v.geometry.paths).toHaveLength(1); // hover flows into the press of the same contact
    expect(v.geometry.start).toEqual({ x: 5, y: 10 });
    expect(v.geometry.end).toEqual({ x: 170, y: 10 });
    // centre = 20 + 0.5*300 = 170; half = 0.1*300 = 30
    expect(v.targetRegion).toEqual({ x: 140, y: 0, width: 60, height: 64 });
  });

  it("throws RangeError for an invalid layout instead of drawing garbage", () => {
    expect(() => buildSliderTrajectory(session([]), { ...layout, trackWidth: 10 }, challenge, 64)).toThrow(RangeError);
  });
});

describe("slider motion series selector (drag only)", () => {
  it("excludes hover and keeps each drag attempt as its own segment", () => {
    const s = session([
      ev(0, "pointermove", 0, T), ev(10, "pointermove", 5000, T), // wild hover: must not appear in the chart
      ev(100, "pointerdown", 20), ev(200, "pointermove", 30), ev(300, "pointerup", 40),
      ev(5000, "pointerdown", 20), ev(5100, "pointermove", 50), ev(5200, "pointerup", 80),
    ]);
    const series = sliderMotionSeries(s);
    expect(series.segments).toHaveLength(2);
    const speeds = series.segments.flatMap((g) => g.velocity.map((x) => x.value));
    expect(Math.max(...speeds)).toBe(300); // 30px in 100ms; the 5000px hover jump is absent
    expect(sliderDragDomain(s)).toEqual([100, 5200]);
  });

  it("no drags: empty series and no domain", () => {
    const s = session([ev(0, "pointermove", 0, T), ev(10, "pointermove", 10, T)]);
    expect(sliderMotionSeries(s).segments).toEqual([]);
    expect(sliderDragDomain(s)).toBeNull();
  });
});

describe("slider metric descriptors", () => {
  it("expose raw values with units, and nulls display as a dash", () => {
    const f = { dragDuration: null, releaseError: 2.44, overshoot: 0, numberOfAttempts: 2 } as SliderFeatures;
    const rows = sliderAttemptMetrics(f);
    expect(rows.map((r) => r.id)).toEqual(["dragDuration", "releaseError", "overshoot", "numberOfAttempts"]);
    expect(rows.map(formatMetricValue)).toEqual(["—", "2.4 px", "0.0 px", "2"]);
    const second = rows[1];
    expect(second && "value" in second ? second.value : undefined).toBe(2.44); // not rounded in the descriptor
  });
});
