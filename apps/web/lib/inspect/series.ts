import type { SeriesSample } from "@captchalab/captcha-core";

/**
 * The single definition of a drawable/listable series sample. The SVG chart, its text summary and
 * the data table all use these helpers, so they can never disagree about what a "sample" or a
 * "segment" is.
 */
export type Segments = readonly (readonly SeriesSample[])[];

export function isValidSample(s: SeriesSample): boolean {
  return Number.isFinite(s.t) && Number.isFinite(s.value);
}

export function validSamples(segment: readonly SeriesSample[]): SeriesSample[] {
  return segment.filter(isValidSample);
}

/** Segments that contain at least one valid sample (what a reader perceives as a segment). */
export function countValidSegments(segments: Segments): number {
  let n = 0;
  for (const seg of segments) if (seg.some(isValidSample)) n++;
  return n;
}

/** Number of valid samples across all segments, without allocating. */
export function countValidSamples(segments: Segments): number {
  let n = 0;
  for (const seg of segments) for (const s of seg) if (isValidSample(s)) n++;
  return n;
}
