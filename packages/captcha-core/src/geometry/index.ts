export interface Point {
  x: number;
  y: number;
}

export interface TimedPoint extends Point {
  t: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Sum of segment lengths in px. 0 for fewer than two points. */
export function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1] as Point, points[i] as Point);
  }
  return total;
}

/** Heading in radians, (-pi, pi]. */
export function heading(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Smallest absolute difference between two headings, in [0, pi]. */
export function angleDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

/**
 * Number of turns sharper than `thresholdRad` between consecutive non-zero segments.
 * Zero-length segments carry no heading and are skipped.
 */
export function countDirectionChanges(
  points: readonly Point[],
  thresholdRad = Math.PI / 4,
): number {
  let prev: number | undefined;
  let count = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    if (a.x === b.x && a.y === b.y) continue;
    const h = heading(a, b);
    if (prev !== undefined && angleDelta(prev, h) > thresholdRad) count++;
    prev = h;
  }
  return count;
}
