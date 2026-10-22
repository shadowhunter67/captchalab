import { describe, expect, it } from "vitest";
import { buildMotionSeries } from "@captchalab/captcha-core";
import { formatAcceleration, formatVelocity } from "@/lib/format";
import { buildChartModel, describeSeries, type ChartSize } from "../chart";
import { countValidSamples, countValidSegments } from "../series";
import { DEFAULT_TABLE_ROWS, MAX_TABLE_ROWS, projectSeriesTable } from "../series-table";

const size: ChartSize = { width: 400, height: 100, margin: { top: 10, right: 10, bottom: 20, left: 40 } };
const seg = (pairs: [number, number][]) => pairs.map(([t, value]) => ({ t, value }));
const pts = (arr: [number, number][]) => arr.map(([t, x]) => ({ t, x, y: 0 }));

describe("series table projection", () => {
  it("copies the series values and times unchanged, numbering segments and samples", () => {
    const t = projectSeriesTable([seg([[50, 100], [150, 300]]), seg([[5050, 40]])]);
    expect(t.rows).toEqual([
      { segment: 1, sample: 1, t: 50, value: 100 },
      { segment: 1, sample: 2, t: 150, value: 300 },
      { segment: 2, sample: 1, t: 5050, value: 40 },
    ]);
    expect(t).toMatchObject({ total: 3, shown: 3, segments: 2 });
  });

  it("is built from the real motion series: velocity and acceleration match the math exactly", () => {
    const series = buildMotionSeries([pts([[0, 0], [100, 10], [200, 40], [300, 50]])]);
    const velocity = projectSeriesTable(series.segments.map((s) => s.velocity));
    const acceleration = projectSeriesTable(series.segments.map((s) => s.acceleration));
    expect(velocity.rows.map((r) => [r.t, r.value])).toEqual([[50, 100], [150, 300], [250, 100]]);
    expect(acceleration.rows.map((r) => [r.t, r.value])).toEqual([[100, 2000], [200, -2000]]);
    // Units appear in the formatted cells exactly as the table shows them.
    expect(formatVelocity(velocity.rows[1]?.value ?? null, 1)).toBe("300.0 px/s");
    expect(formatAcceleration(acceleration.rows[1]?.value ?? null, 1)).toBe("-2000.0 px/s²");
  });

  it("chart, summary text and table agree on samples AND segments for the same input", () => {
    const cases = [
      [seg([[0, 1], [10, Number.NaN], [20, 3]]), seg([[30, 4]]), []],
      [seg([[0, Number.NaN]]), seg([[5, 2], [6, 3]])], // first segment has only invalid samples
      [seg([[Number.POSITIVE_INFINITY, 1]]), seg([[1, Number.NaN]])], // nothing valid
      [],
    ];
    for (const segments of cases) {
      const table = projectSeriesTable(segments);
      const chart = buildChartModel(segments, [0, 30], size, true);
      expect(table.total).toBe(chart.sampleCount);
      expect(table.total).toBe(countValidSamples(segments));
      expect(table.segments).toBe(countValidSegments(segments));
      const text = describeSeries("Velocity", "px/s", segments, String);
      if (table.total === 0) expect(text).toMatch(/Not enough motion samples/);
      else expect(text).toContain(`across ${table.segments} movement segment${table.segments === 1 ? "" : "s"}`);
    }
  });

  it("cuts long series after the limit, never exceeds the hard ceiling, and reports the full total", () => {
    const long = seg(Array.from({ length: 2500 }, (_, i) => [i, i] as [number, number]));
    const cut = projectSeriesTable([long]);
    expect(cut.shown).toBe(DEFAULT_TABLE_ROWS);
    expect(cut.total).toBe(2500);
    const all = projectSeriesTable([long], Number.POSITIVE_INFINITY);
    expect(all.shown).toBe(MAX_TABLE_ROWS); // ceiling, not 2500
    expect(all.total).toBe(2500);
    const small = projectSeriesTable([seg([[0, 1], [1, 2]])], Number.POSITIVE_INFINITY);
    expect(small.shown).toBe(2);
  });

  it("empty input gives an empty table", () => {
    expect(projectSeriesTable([])).toEqual({ rows: [], total: 0, shown: 0, segments: 0 });
    expect(projectSeriesTable([[], []]).total).toBe(0);
  });

  it("format helpers keep units and precision for table cells but default to whole numbers", () => {
    expect(formatVelocity(248.34, 1)).toBe("248.3 px/s");
    expect(formatVelocity(248.34)).toBe("248 px/s");
    expect(formatAcceleration(-183.74, 1)).toBe("-183.7 px/s²");
    expect(formatVelocity(null, 1)).toBe("—");
  });
});
