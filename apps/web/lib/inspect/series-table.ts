import type { SeriesSample } from "@captchalab/captcha-core";
import { validSamples } from "./series";

export const DEFAULT_TABLE_ROWS = 100;
/** Hard ceiling even for "Show all": more rows than this are never put in the DOM. */
export const MAX_TABLE_ROWS = 1000;

export interface SeriesTableRow {
  /** 1-based, counting only segments that have at least one valid sample. */
  segment: number;
  /** 0-based index of the segment in the input (aligned with caller-supplied labels). */
  segmentIndex: number;
  /** 1-based position of the sample inside its segment. */
  sample: number;
  /** ms since session start */
  t: number;
  value: number;
}

export interface SeriesTable {
  rows: SeriesTableRow[];
  /** Valid samples in all segments (equals the chart's sample count). */
  total: number;
  /** Rows actually returned (<= total). */
  shown: number;
  /** Segments with at least one valid sample. */
  segments: number;
}

/**
 * Tabular projection of exactly the series the chart draws (the caller passes the same
 * `segments`). No math here: values are copied, and validity uses the shared rule in ./series.
 * Rows are cut after `limit` (never above MAX_TABLE_ROWS); the caller is told `total` vs `shown`
 * so nothing is dropped silently.
 */
export function projectSeriesTable(
  segments: readonly (readonly SeriesSample[])[],
  limit = DEFAULT_TABLE_ROWS,
): SeriesTable {
  const cap = Math.min(limit, MAX_TABLE_ROWS);
  const rows: SeriesTableRow[] = [];
  let total = 0;
  let segmentNumber = 0;
  for (const [segmentIndex, seg] of segments.entries()) {
    const valid = validSamples(seg);
    if (valid.length === 0) continue;
    segmentNumber++;
    valid.forEach((s, i) => {
      total++;
      if (rows.length < cap) rows.push({ segment: segmentNumber, segmentIndex, sample: i + 1, t: s.t, value: s.value });
    });
  }
  return { rows, total, shown: rows.length, segments: segmentNumber };
}
