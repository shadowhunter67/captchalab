/** Presentation helpers only. Feature values are never rounded in the feature layer. */

const NONE = "n/a";

export function formatMilliseconds(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return NONE;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function formatPixels(px: number | null): string {
  if (px === null || !Number.isFinite(px)) return NONE;
  return `${px.toFixed(1)} px`;
}

export function formatVelocity(pxPerSecond: number | null): string {
  if (pxPerSecond === null || !Number.isFinite(pxPerSecond)) return NONE;
  return `${Math.round(pxPerSecond)} px/s`;
}

export function formatCount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return NONE;
  return String(Math.round(n));
}
