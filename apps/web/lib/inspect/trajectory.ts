import type { TimedPoint } from "@captchalab/captcha-core";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** CAPTCHA-agnostic trajectory geometry: only points in, drawable shapes out. */
export interface TrajectoryGeometry {
  viewBox: Rect;
  /** One SVG path per track; tracks are never joined. */
  paths: string[];
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** First and last sample time (ms since session start); null without samples. */
  span: { startT: number; endT: number } | null;
}

const PAD = 12;

/**
 * Pure: tracks (already selected by the caller) -> geometry. `bounds` are extra rectangles the
 * view must contain (e.g. the track a CAPTCHA draws underneath). Never mutates its input and
 * knows nothing about any plugin.
 */
export function buildTrajectoryGeometry(
  tracks: readonly (readonly TimedPoint[])[],
  bounds: readonly Rect[] = [],
): TrajectoryGeometry {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const grow = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const r of bounds) {
    grow(r.x, r.y);
    grow(r.x + r.width, r.y + r.height);
  }

  let startT = Number.POSITIVE_INFINITY;
  let endT = Number.NEGATIVE_INFINITY;
  let start: TrajectoryGeometry["start"] = null;
  let end: TrajectoryGeometry["end"] = null;
  const paths: string[] = [];
  for (const track of tracks) {
    if (track.length === 0) continue;
    paths.push(track.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "));
    for (const p of track) {
      grow(p.x, p.y);
      if (p.t < startT) {
        startT = p.t;
        start = { x: p.x, y: p.y };
      }
      if (p.t >= endT) {
        endT = p.t;
        end = { x: p.x, y: p.y };
      }
    }
  }

  if (!Number.isFinite(minX)) {
    return { viewBox: { x: 0, y: 0, width: 1, height: 1 }, paths, start, end, span: null };
  }
  return {
    viewBox: { x: minX - PAD, y: minY - PAD, width: maxX - minX + 2 * PAD, height: maxY - minY + 2 * PAD },
    paths,
    start,
    end,
    span: start && end ? { startT, endT } : null,
  };
}
