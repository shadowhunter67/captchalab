import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, inferModality, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  deriveDragAttempts,
  extractDragDropFeatures,
  type DragDropChallenge,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { formatMetricValue } from "@/lib/inspect/metrics";
import { buildChartModel, type ChartSize } from "@/lib/inspect/chart";
import { projectSeriesTable } from "@/lib/inspect/series-table";
import { createDragDropReplay } from "../drag-drop-replay-state";
import {
  attemptLabels,
  attemptRows,
  buildDragDropTrajectory,
  dragDomain,
  dragDropMetrics,
  dragDropMotionSeries,
  selectedPoint,
} from "../drag-drop-view-data";

const layout: DragDropLayout = { width: 400, height: 300 };
const challenge: DragDropChallenge = {
  id: "c", itemSize: 0.17, dropTolerance: 0.14,
  items: [
    { id: "item-a", kind: "circle", start: { x: 0.25, y: 0.8 } },
    { id: "item-b", kind: "square", start: { x: 0.75, y: 0.8 } },
  ],
  targets: [
    { id: "target-a", acceptsItemId: "item-a", position: { x: 0.25, y: 0.2 } },
    { id: "target-b", acceptsItemId: "item-b", position: { x: 0.75, y: 0.2 } },
  ],
};
type Kind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
const ev = (t: number, type: Kind, x: number, y: number, item: string, id = 1): InteractionEvent => ({
  t, type, x, y, pointerId: id, pointerType: "mouse", target: `drag-item:${item}`,
});
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "drag-drop", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});
const chartSize: ChartSize = { width: 400, height: 100, margin: { top: 10, right: 10, bottom: 20, left: 40 } };

// 1) a (grabbed 10px right of center) misses, 2) a drops correctly, 3) b is cancelled, 4) b drops on the wrong target? no: b correct
const events: InteractionEvent[] = [
  ev(100, "pointerdown", 110, 240, "item-a"), ev(200, "pointermove", 210, 150, "item-a"), ev(300, "pointerup", 210, 150, "item-a"), // miss: returns
  ev(500, "pointerdown", 100, 240, "item-a"), ev(600, "pointermove", 100, 150, "item-a"), ev(700, "pointerup", 100, 62, "item-a"), // correct
  ev(900, "pointerdown", 300, 240, "item-b", 2), ev(1000, "pointermove", 300, 200, "item-b", 2), ev(1100, "pointercancel", 300, 200, "item-b", 2), // cancelled
  ev(1300, "pointerdown", 300, 240, "item-b"), ev(1400, "pointermove", 300, 150, "item-b"), ev(1500, "pointerup", 300, 60, "item-b"), // correct
];
const s = session(events);
const analysis = deriveDragAttempts(challenge, layout, s);

describe("drag & drop replay model", () => {
  const m = createDragDropReplay(challenge, layout, s);

  it("covers the drags and starts with every item at its start", () => {
    expect(m.range).toEqual([100, 1500]);
    expect(m.at(0).items["item-a"]).toEqual({ center: { x: 100, y: 240 }, lifted: false });
    expect(m.at(0).pointer).toBeNull();
    expect(m.at(0).caption).toBe("");
  });

  it("a held item follows pointer minus grab offset; the pointer dot is the raw pointer", () => {
    const mid = m.at(200);
    expect(mid.items["item-a"]).toEqual({ center: { x: 200, y: 150 }, lifted: true }); // pointer (210,150) - offset (10,0)
    expect(mid.pointer).toEqual({ x: 210, y: 150 });
    expect(mid.caption).toBe("Circle · attempt 1: dragging");
    expect(m.at(150).items["item-a"]?.center).toEqual({ x: 150, y: 195 }); // interpolated between samples
  });

  it("failed drop: the item returns to where it was before the drag", () => {
    const after = m.at(350);
    expect(after.items["item-a"]).toEqual({ center: { x: 100, y: 240 }, lifted: false });
    expect(after.caption).toBe("Circle · attempt 1: Dropped away from any drop area (returned)");
  });

  it("successful drop: the item snaps onto the target center and stays there", () => {
    expect(m.at(700).items["item-a"]).toEqual({ center: { x: 100, y: 60 }, lifted: false });
    expect(m.at(5000).items["item-a"]?.center).toEqual({ x: 100, y: 60 });
    expect(m.at(700).caption).toBe("Circle · attempt 2: Dropped on its matching target");
  });

  it("a cancelled drag returns the item and is captioned as cancelled; other items are untouched", () => {
    const c = m.at(1000);
    expect(c.items["item-b"]?.lifted).toBe(true);
    expect(c.items["item-a"]?.center).toEqual({ x: 100, y: 60 });
    const after = m.at(1200);
    expect(after.items["item-b"]).toEqual({ center: { x: 300, y: 240 }, lifted: false });
    expect(after.caption).toBe("Square · attempt 1: Cancelled (returned)");
  });

  it("an overlapped (ignored) attempt never moves anything, even if its carried state holds a later release", () => {
    const evs = [
      ev(0, "pointerdown", 300, 240, "item-b", 2), // b is held for a long time
      ev(100, "pointerdown", 100, 240, "item-a"), ev(200, "pointerup", 300, 60, "item-a"), // overlapped: ignored
      ev(1000, "pointerup", 300, 60, "item-b", 2), // b is released on target-b: correct
    ];
    const rm = createDragDropReplay(challenge, layout, session(evs));
    expect(rm.at(500).items["item-b"]?.lifted).toBe(true);
    expect(rm.at(500).items["item-a"]).toEqual({ center: { x: 100, y: 240 }, lifted: false }); // the ignored drop did nothing
    expect(rm.at(1200).items["item-b"]?.center).toEqual({ x: 300, y: 60 });
  });

  it("an unfinished drag stays in the air; no drags means nothing to replay", () => {
    const open = createDragDropReplay(challenge, layout, session([ev(10, "pointerdown", 100, 240, "item-a"), ev(50, "pointermove", 120, 200, "item-a")]));
    expect(open.at(9999).items["item-a"]?.lifted).toBe(true);
    const none = createDragDropReplay(challenge, layout, session([]));
    expect(none.range).toBeNull();
    expect(none.at(0)).toEqual({ items: {}, pointer: null, caption: "" });
    const one = createDragDropReplay(challenge, layout, session([ev(7, "pointerdown", 100, 240, "item-a"), ev(7, "pointerup", 100, 60, "item-a")]));
    expect(one.range).toEqual([7, 8]);
  });
});

describe("drag & drop view data", () => {
  it("one numbered segment per attempt, labelled by item and attempt; chart and table agree", () => {
    const labels = attemptLabels(challenge, analysis);
    expect(labels).toEqual(["Circle · attempt 1", "Circle · attempt 2", "Square · attempt 1", "Square · attempt 2"]);
    const series = dragDropMotionSeries(analysis);
    expect(series.segments).toHaveLength(4);
    const velocity = series.segments.map((x) => x.velocity);
    const chart = buildChartModel(velocity, dragDomain(analysis) ?? [0, 1], chartSize, true);
    const table = projectSeriesTable(velocity);
    expect(table.total).toBe(chart.sampleCount);
    expect(table.segments).toBe(4);
    expect(chart.labels.map((l) => l.text)).toEqual(["1", "2", "3", "4"]);
    expect(chart.paths).toHaveLength(4);
    // No velocity across a gesture boundary: each 3-event attempt yields exactly 2 speed samples (no extra
    // sample joining the end of one drag to the start of the next), and 1 acceleration sample.
    expect(velocity.map((v) => v.length)).toEqual([2, 2, 2, 2]);
    expect(series.segments.map((x) => x.acceleration.length)).toEqual([1, 1, 1, 1]);
  });

  it("trajectory geometry: a path per attempt, start numbers, surface in view", () => {
    const g = buildDragDropTrajectory(analysis, layout);
    expect(g.paths).toHaveLength(4);
    expect(g.trackStarts).toHaveLength(4);
    expect(g.surface).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(g.viewBox.x + g.viewBox.width).toBeGreaterThanOrEqual(400);
  });

  it("attempt rows describe outcomes in words; cancelled drags have no duration or error", () => {
    const rows = attemptRows(challenge, analysis);
    expect(rows.map((r) => r.outcome)).toEqual([
      "Dropped away from any drop area (returned)", "Dropped on its matching target", "Cancelled (returned)", "Dropped on its matching target",
    ]);
    expect(rows[2]).toMatchObject({ duration: null, releaseError: null });
    expect(rows[1]).toMatchObject({ duration: 200 });
  });

  it("metric descriptors: raw values with units, a dash for unavailable ones, modality as text", () => {
    const f = extractDragDropFeatures(challenge, s, { layout }).features;
    const shown = Object.fromEntries(dragDropMetrics(f).map((r) => [r.id, formatMetricValue(r)]));
    expect(shown).toMatchObject({
      numberOfDragAttempts: "4", successfulDropCount: "2", failedDropCount: "1", cancelledDragCount: "1",
      meanDragDuration: "200 ms", inputModality: "mouse", reactionTime: "100 ms",
    });
    const none = Object.fromEntries(dragDropMetrics(extractDragDropFeatures(challenge, session([]), { layout }).features).map((r) => [r.id, formatMetricValue(r)]));
    expect(none).toMatchObject({ reactionTime: "—", meanDragDuration: "—", meanReleaseError: "—", numberOfDragAttempts: "0" });
  });

  it("selected event maps to its pointer position, none for no selection", () => {
    expect(selectedPoint(s, null)).toBeNull();
    expect(selectedPoint(s, 0)).toEqual({ x: 110, y: 240 });
    expect(selectedPoint(s, 999)).toBeNull();
  });
});
