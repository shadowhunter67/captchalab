import { distance, type Point } from "@captchalab/captcha-core";
import type { DragDropChallenge, DragDropLayout, DragDropTarget, NormalizedPoint } from "./types";

/**
 * Pure geometry shared by the feature extractor and the web UI (no DOM). All px values are CSS px in
 * surface coordinates. See the coordinate model in ./types.ts.
 */

export function isValidLayout(layout: DragDropLayout): boolean {
  return (
    Number.isFinite(layout.width) && Number.isFinite(layout.height) && layout.width > 0 && layout.height > 0
  );
}

/** Throws RangeError for an invalid layout (callers validate first; extractors must not guess). */
export function assertLayout(layout: DragDropLayout): void {
  if (!isValidLayout(layout)) throw new RangeError("Invalid drag-drop layout: width and height must be finite and > 0.");
}

/** Reference length for size fractions: the shorter side of the surface. */
export function layoutScale(layout: DragDropLayout): number {
  assertLayout(layout);
  return Math.min(layout.width, layout.height);
}

export function normalizedToPx(p: NormalizedPoint, layout: DragDropLayout): Point {
  assertLayout(layout);
  return { x: p.x * layout.width, y: p.y * layout.height };
}

export function pxToNormalized(p: Point, layout: DragDropLayout): NormalizedPoint {
  assertLayout(layout);
  return { x: p.x / layout.width, y: p.y / layout.height };
}

export function itemSizePx(challenge: DragDropChallenge, layout: DragDropLayout): number {
  return challenge.itemSize * layoutScale(layout);
}

export function hitRadiusPx(challenge: DragDropChallenge, layout: DragDropLayout): number {
  return challenge.dropTolerance * layoutScale(layout);
}

/** Keeps an item center on the surface, so a dragged item can never be lost off-screen. */
export function clampToSurface(p: Point, layout: DragDropLayout): Point {
  assertLayout(layout);
  return {
    x: Math.min(layout.width, Math.max(0, p.x)),
    y: Math.min(layout.height, Math.max(0, p.y)),
  };
}

/** The nearest target whose hit area (a circle) contains `center`, or null. Boundary is inclusive. */
export function hitTarget(
  challenge: DragDropChallenge,
  layout: DragDropLayout,
  center: Point,
): DragDropTarget | null {
  const radius = hitRadiusPx(challenge, layout);
  let best: DragDropTarget | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const t of challenge.targets) {
    const d = distance(center, normalizedToPx(t.position, layout));
    if (d <= radius && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}
