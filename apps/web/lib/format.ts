/** Presentation helpers only. Feature values are never rounded in the feature layer. */

/** Shown for a metric that is not available (null / NaN). */
export const NO_VALUE = "—";

export function formatMilliseconds(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return NO_VALUE;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function formatPixels(px: number | null): string {
  if (px === null || !Number.isFinite(px)) return NO_VALUE;
  return `${px.toFixed(1)} px`;
}

export function formatVelocity(pxPerSecond: number | null, digits = 0): string {
  if (pxPerSecond === null || !Number.isFinite(pxPerSecond)) return NO_VALUE;
  return `${pxPerSecond.toFixed(digits)} px/s`;
}

export function formatAcceleration(pxPerSecond2: number | null, digits = 0): string {
  if (pxPerSecond2 === null || !Number.isFinite(pxPerSecond2)) return NO_VALUE;
  return `${pxPerSecond2.toFixed(digits)} px/s²`;
}

export function formatDegrees(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return NO_VALUE;
  return `${deg.toFixed(1)}°`;
}

export function formatAngularVelocity(degPerSecond: number | null): string {
  if (degPerSecond === null || !Number.isFinite(degPerSecond)) return NO_VALUE;
  return `${Math.round(degPerSecond)} °/s`;
}

export function formatCount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return NO_VALUE;
  return String(Math.round(n));
}
