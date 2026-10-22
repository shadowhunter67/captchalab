import type { SeriesSample } from "@captchalab/captcha-core";
import { countValidSegments, isValidSample, validSamples } from "./series";

export interface ChartSize {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface ChartTick {
  /** Position in SVG user units. */
  pos: number;
  /** Data value the tick stands for. */
  value: number;
}

export interface ChartModel {
  empty: boolean;
  sampleCount: number;
  xDomain: [number, number];
  yDomain: [number, number];
  /** One SVG path per segment with at least 2 samples; segments are never joined. */
  paths: string[];
  /** Isolated samples (segments with exactly 1 sample) drawn as dots. */
  dots: { x: number; y: number }[];
  xTicks: ChartTick[];
  yTicks: ChartTick[];
  /** y of value 0 when 0 lies inside the y domain, else null. */
  zeroY: number | null;
  scaleX: (t: number) => number;
  scaleY: (v: number) => number;
  plot: { left: number; right: number; top: number; bottom: number };
}

const num = (n: number): string => n.toFixed(2);

/**
 * Pure scale + path computation for the SVG charts. Handles empty input, a single sample,
 * constant values (domain widened so nothing divides by zero) and a degenerate x range.
 * `includeZero` forces 0 into the y domain (velocity baseline; acceleration is signed, so it is
 * included automatically when the data crosses zero and forced when requested).
 */
export function buildChartModel(
  segments: readonly (readonly SeriesSample[])[],
  xDomainIn: readonly [number, number],
  size: ChartSize,
  includeZero: boolean,
): ChartModel {
  const plot = {
    left: size.margin.left,
    right: size.width - size.margin.right,
    top: size.margin.top,
    bottom: size.height - size.margin.bottom,
  };
  const x0 = xDomainIn[0];
  const x1 = xDomainIn[1] > x0 ? xDomainIn[1] : x0 + 1; // widen a degenerate range

  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;
  let sampleCount = 0;
  for (const seg of segments) {
    for (const s of seg) {
      if (!isValidSample(s)) continue;
      sampleCount++;
      yMin = Math.min(yMin, s.value);
      yMax = Math.max(yMax, s.value);
    }
  }
  const empty = sampleCount === 0;
  if (empty) {
    yMin = 0;
    yMax = 1;
  }
  if (includeZero) {
    yMin = Math.min(yMin, 0);
    yMax = Math.max(yMax, 0);
  }
  if (yMax <= yMin) {
    const pad = Math.max(1, Math.abs(yMax) * 0.1);
    yMin -= pad;
    yMax += pad;
  }

  const scaleX = (t: number): number => plot.left + ((t - x0) / (x1 - x0)) * (plot.right - plot.left);
  const scaleY = (v: number): number => plot.bottom - ((v - yMin) / (yMax - yMin)) * (plot.bottom - plot.top);

  const paths: string[] = [];
  const dots: { x: number; y: number }[] = [];
  for (const seg of segments) {
    const pts = validSamples(seg);
    if (pts.length === 1) {
      const p = pts[0] as SeriesSample;
      dots.push({ x: scaleX(p.t), y: scaleY(p.value) });
    } else if (pts.length >= 2) {
      paths.push(pts.map((p, i) => `${i === 0 ? "M" : "L"}${num(scaleX(p.t))} ${num(scaleY(p.value))}`).join(" "));
    }
  }

  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((value) => ({ value, pos: scaleY(value) }));
  const xTicks = [x0, (x0 + x1) / 2, x1].map((value) => ({ value, pos: scaleX(value) }));
  const zeroY = yMin <= 0 && yMax >= 0 ? scaleY(0) : null;

  return { empty, sampleCount, xDomain: [x0, x1], yDomain: [yMin, yMax], paths, dots, xTicks, yTicks, zeroY, scaleX, scaleY, plot };
}

/** Text alternative for a chart: the range actually present in the data. */
export function describeSeries(
  name: string,
  unit: string,
  segments: readonly (readonly SeriesSample[])[],
  format: (v: number) => string,
): string {
  const samples = segments.flatMap(validSamples);
  if (samples.length === 0) return `Not enough motion samples to calculate ${name.toLowerCase()}.`;
  const lo = samples.reduce((m, s) => Math.min(m, s.value), Number.POSITIVE_INFINITY);
  const peak = samples.reduce((m, s) => (Math.abs(s.value) > Math.abs(m.value) ? s : m));
  const hi = samples.reduce((m, s) => Math.max(m, s.value), Number.NEGATIVE_INFINITY);
  const drags = countValidSegments(segments);
  return `${name} ranged from ${format(lo)} to ${format(hi)} ${unit} across ${drags} movement segment${drags === 1 ? "" : "s"}. Largest magnitude ${format(peak.value)} ${unit} at ${(peak.t / 1000).toFixed(2)} s.`;
}
