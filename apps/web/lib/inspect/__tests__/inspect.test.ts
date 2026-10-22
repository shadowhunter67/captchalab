import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import { buildChartModel, describeSeries, type ChartSize } from "../chart";
import { binContainsTime, buildTimelineModel, projectEventFields, stepSelection, timelineKind } from "../events";
import { formatMetricValue, interactionMetrics } from "../metrics";
import { buildTrajectoryGeometry } from "../trajectory";

const size: ChartSize = { width: 400, height: 100, margin: { top: 10, right: 10, bottom: 20, left: 40 } };
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "t", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: "mouse",
});
const ptr = (t: number, type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel", x = 0): InteractionEvent => ({
  t, type, x, y: 5, pointerId: 1, pointerType: "mouse",
});

describe("metric descriptors", () => {
  it("formats values by unit and shows a dash for null/undefined/NaN", () => {
    expect(formatMetricValue({ id: "m", label: "m", value: 1280, unit: "ms" })).toBe("1.28 s");
    expect(formatMetricValue({ id: "m", label: "m", value: 2.44, unit: "px" })).toBe("2.4 px");
    expect(formatMetricValue({ id: "m", label: "m", value: 247.6, unit: "px/s" })).toBe("248 px/s");
    expect(formatMetricValue({ id: "m", label: "m", value: -2000, unit: "px/s²" })).toBe("-2000 px/s²");
    expect(formatMetricValue({ id: "m", label: "m", value: 3, unit: "count" })).toBe("3");
    expect(formatMetricValue({ id: "m", label: "m", value: null, unit: "px" })).toBe("—");
    expect(formatMetricValue({ id: "m", label: "m", value: undefined, unit: "ms" })).toBe("—");
    expect(formatMetricValue({ id: "m", label: "m", value: Number.NaN, unit: "count" })).toBe("—");
    expect(formatMetricValue({ id: "m", label: "m", text: "keyboard" })).toBe("keyboard");
    expect(formatMetricValue({ id: "m", label: "m", value: 0.256, unit: "count", format: (v) => `${(v * 100).toFixed(0)}%` })).toBe("26%");
  });

  it("interaction metrics tolerate missing features without defaulting to zero", () => {
    const rows = interactionMetrics({ eventCount: 5 });
    expect(rows.find((r) => r.id === "eventCount")?.value).toBe(5);
    expect(rows.filter((r) => r.value === undefined).length).toBe(rows.length - 1);
    expect(rows.map((r) => formatMetricValue(r)).filter((v) => v === "—")).toHaveLength(rows.length - 1);
  });
});

describe("event projection", () => {
  it("shows only the fields that exist", () => {
    const withPressure = projectEventFields({
      t: 10, type: "pointerdown", x: 3, y: 5, pointerId: 1, pointerType: "mouse", pressure: 0.5, target: "slider-handle",
    });
    expect(withPressure.map((f) => f.label)).toEqual(["type", "t", "x", "y", "pointerId", "pointerType", "pressure", "target"]);
    expect(projectEventFields(ptr(10, "pointermove")).map((f) => f.label)).not.toContain("pressure");
    expect(projectEventFields({ t: 5, type: "keydown", code: "ArrowLeft" }).map((f) => f.label)).toEqual(["type", "t", "code"]);
  });
});

describe("timeline model", () => {
  const s = session([
    ptr(0, "pointerdown"), ptr(10, "pointermove", 1), ptr(11, "pointermove", 2), ptr(90, "pointermove", 3),
    ptr(100, "pointerup"), { t: 150, type: "keydown", code: "End" },
  ]);

  it("separates markers from move density and keeps stable event indexes", () => {
    const m = buildTimelineModel(s, 10);
    expect(m.markers.map((x) => [x.index, x.kind])).toEqual([[0, "down"], [4, "up"], [5, "keydown"]]);
    expect(m.bins.reduce((a, b) => a + b.count, 0)).toBe(3);
    expect(m.bins[0]).toMatchObject({ count: 2, firstIndex: 1 });
    expect(m.startT).toBe(0);
    expect(m.endT).toBe(150);
    expect(m.eventCount).toBe(6);
  });

  it("handles empty sessions and identical timestamps", () => {
    expect(buildTimelineModel(session([])).markers).toEqual([]);
    const same = buildTimelineModel(session([ptr(5, "pointerdown"), ptr(5, "pointermove")]));
    expect(same.endT).toBeGreaterThan(same.startT);
    expect(same.bins[0]?.count).toBe(1);
  });

  it("extra (annotation) times widen the axis so trailing annotations stay inside it", () => {
    const m = buildTimelineModel(s, 10, [500]);
    expect(m.endT).toBe(500);
    expect(buildTimelineModel(s, 10, [Number.NaN]).endT).toBe(150);
  });

  it("bin membership is half-open (a boundary time belongs to one bin) and the last bin includes the end", () => {
    const m = buildTimelineModel(s, 10);
    const t = m.startT + 0.5 * (m.endT - m.startT); // exactly the boundary between bins 4 and 5
    const containing = Array.from({ length: 10 }, (_, i) => ({ from: i / 10, to: (i + 1) / 10, count: 1, firstIndex: i }))
      .filter((b) => binContainsTime(m, b, t));
    expect(containing).toHaveLength(1);
    expect(binContainsTime(m, { from: 0.9, to: 1, count: 1, firstIndex: 0 }, m.endT)).toBe(true);
  });

  it("classifies kinds and steps selection within bounds", () => {
    expect(timelineKind(ptr(0, "pointercancel"))).toBe("cancel");
    expect(stepSelection(null, 1, 5)).toBe(0);
    expect(stepSelection(null, -1, 5)).toBe(4);
    expect(stepSelection(4, 1, 5)).toBe(4);
    expect(stepSelection(0, -1, 5)).toBe(0);
    expect(stepSelection(2, 1, 5)).toBe(3);
    expect(stepSelection(null, 1, 0)).toBeNull();
  });

  it("handles a thousand moves without a row per event", () => {
    const many = session(Array.from({ length: 1000 }, (_, i) => ptr(i, "pointermove", i)));
    const m = buildTimelineModel(many, 48);
    expect(m.bins.length).toBeLessThanOrEqual(48);
    expect(m.bins.reduce((a, b) => a + b.count, 0)).toBe(1000);
  });
});

describe("chart model", () => {
  const seg = (pairs: [number, number][]) => pairs.map(([t, value]) => ({ t, value }));

  it("scales paths into the plot area and keeps segments separate", () => {
    const m = buildChartModel([seg([[0, 0], [100, 100]]), seg([[200, 50], [300, 50]])], [0, 300], size, true);
    expect(m.paths).toHaveLength(2);
    expect(m.scaleX(0)).toBe(40);
    expect(m.scaleX(300)).toBe(390);
    expect(m.scaleY(m.yDomain[0])).toBe(80);
    expect(m.scaleY(m.yDomain[1])).toBe(10);
    expect(m.empty).toBe(false);
  });

  it("empty input, a single sample and constant values never produce NaN", () => {
    const empty = buildChartModel([], [0, 0], size, true);
    expect(empty.empty).toBe(true);
    expect(empty.paths).toEqual([]);
    expect(Number.isFinite(empty.scaleX(5))).toBe(true);

    const one = buildChartModel([seg([[10, 5]])], [10, 10], size, true);
    expect(one.dots).toHaveLength(1);
    expect(Number.isFinite(one.dots[0]?.x)).toBe(true);
    expect(Number.isFinite(one.dots[0]?.y)).toBe(true);

    const flat = buildChartModel([seg([[0, 7], [10, 7]])], [0, 10], size, false);
    expect(flat.yDomain[1]).toBeGreaterThan(flat.yDomain[0]);
    expect(flat.paths[0]).not.toContain("NaN");
  });

  it("draws the zero baseline for signed data and omits it when 0 is outside the domain", () => {
    const signed = buildChartModel([seg([[0, -5], [10, 5]])], [0, 10], size, false);
    expect(signed.zeroY).not.toBeNull();
    const positive = buildChartModel([seg([[0, 5], [10, 9]])], [0, 10], size, false);
    expect(positive.zeroY).toBeNull();
    expect(buildChartModel([seg([[0, 5], [10, 9]])], [0, 10], size, true).zeroY).not.toBeNull();
  });

  it("ignores non-finite samples and describes the series in text", () => {
    const m = buildChartModel([seg([[0, Number.NaN], [5, 3], [8, 4]])], [0, 10], size, true);
    expect(m.sampleCount).toBe(2);
    expect(describeSeries("Velocity", "px/s", [seg([[0, 0], [1, 412]])], (v) => String(Math.round(v)))).toBe(
      "Velocity ranged from 0 to 412 px/s across 1 movement segment. Largest magnitude 412 px/s at 0.00 s.",
    );
    expect(describeSeries("Velocity", "px/s", [], String)).toBe("Not enough motion samples to calculate velocity.");
  });
});

describe("generic trajectory geometry", () => {
  it("builds separate paths, start/end, span and a viewBox including extra bounds", () => {
    const g = buildTrajectoryGeometry(
      [[{ t: 0, x: 10, y: 5 }, { t: 50, x: 90, y: 8 }], [{ t: 500, x: 20, y: 60 }, { t: 600, x: 30, y: 61 }]],
      [{ x: 0, y: 0, width: 300, height: 40 }],
    );
    expect(g.paths).toHaveLength(2);
    expect(g.start).toEqual({ x: 10, y: 5 });
    expect(g.end).toEqual({ x: 30, y: 61 });
    expect(g.span).toEqual({ startT: 0, endT: 600 });
    expect(g.viewBox.x + g.viewBox.width).toBeGreaterThanOrEqual(300);
    expect(g.viewBox.y + g.viewBox.height).toBeGreaterThanOrEqual(61);
  });

  it("copes with no tracks and does not mutate input", () => {
    const empty = buildTrajectoryGeometry([]);
    expect(empty.span).toBeNull();
    expect(empty.viewBox.width).toBeGreaterThan(0);
    const input = [[{ t: 0, x: 1, y: 1 }]];
    const before = JSON.stringify(input);
    buildTrajectoryGeometry(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
