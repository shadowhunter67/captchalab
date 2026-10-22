import { distance, type Point } from "@captchalab/captcha-core";
import { assertLayout, clampToSurface, hitTarget, normalizedToPx } from "./geometry";
import type { DragDropAnswer, DragDropChallenge, DragDropLayout, NormalizedPoint } from "./types";

/** Where every item rests and which target holds it. Normalized, so it survives a resize. */
export interface DragDropState {
  centers: Record<string, NormalizedPoint>;
  placements: Record<string, string | null>;
}

export type DropOutcome = "correct" | "wrong-target" | "miss";

export interface DropResolution {
  outcome: DropOutcome;
  /** The target the item now sits on; null for a miss (the item returned). */
  targetId: string | null;
  /** State after the drop. Unchanged for a miss. */
  state: DragDropState;
  /** The item that was on the target and was sent back to its start by this drop, if any. */
  bumpedItemId: string | null;
  /** Distance, px, from the release center to the center of the item's own target. null if it has none. */
  releaseError: number | null;
}

export function createInitialState(challenge: DragDropChallenge): DragDropState {
  const centers: Record<string, NormalizedPoint> = {};
  const placements: Record<string, string | null> = {};
  for (const item of challenge.items) {
    centers[item.id] = { ...item.start };
    placements[item.id] = null;
  }
  return { centers, placements };
}

/**
 * The single rule for a drop, used by the UI controller and by the feature extractor so the two cannot
 * disagree. `state` is the state BEFORE the drag. Hit testing is geometric: the nearest target area that
 * contains the item's center. An item already on that target is sent back to its start.
 */
export function resolveDrop(
  challenge: DragDropChallenge,
  layout: DragDropLayout,
  state: DragDropState,
  itemId: string,
  releaseCenterPx: Point,
): DropResolution {
  assertLayout(layout);
  const own = challenge.targets.find((t) => t.acceptsItemId === itemId);
  const releaseError = own ? distance(releaseCenterPx, normalizedToPx(own.position, layout)) : null;

  const hit = hitTarget(challenge, layout, releaseCenterPx);
  if (hit === null) {
    return { outcome: "miss", targetId: null, state, bumpedItemId: null, releaseError };
  }
  const centers = { ...state.centers, [itemId]: { ...hit.position } };
  const placements = { ...state.placements, [itemId]: hit.id };
  // A target holds one item. If another item is on it, that item goes back to its start (so a wrong
  // placement can always be fixed: its start spot is never contested).
  const occupant = Object.entries(state.placements).find(([id, target]) => id !== itemId && target === hit.id)?.[0] ?? null;
  const home = occupant === null ? undefined : challenge.items.find((i) => i.id === occupant)?.start;
  if (occupant !== null && home) {
    centers[occupant] = { ...home };
    placements[occupant] = null;
  }
  return {
    outcome: hit.acceptsItemId === itemId ? "correct" : "wrong-target",
    targetId: hit.id,
    state: { centers, placements },
    bumpedItemId: occupant !== null && home ? occupant : null,
    releaseError,
  };
}

/** Grab offset: where the pointer took hold relative to the item's center (px). Kept for the whole drag. */
export function grabOffsetOf(itemCenterPx: Point, pointerPx: Point): Point {
  return { x: pointerPx.x - itemCenterPx.x, y: pointerPx.y - itemCenterPx.y };
}

/** Item center while held: pointer minus grab offset, clamped to the surface. The UI and the extractor both use this. */
export function heldCenterOf(pointerPx: Point, grabOffset: Point, layout: DragDropLayout): Point {
  return clampToSurface({ x: pointerPx.x - grabOffset.x, y: pointerPx.y - grabOffset.y }, layout);
}

export function allPlaced(challenge: DragDropChallenge, state: DragDropState): boolean {
  return challenge.items.every((item) => state.placements[item.id] != null);
}

export function allCorrect(challenge: DragDropChallenge, state: DragDropState): boolean {
  return challenge.items.every((item) => {
    const target = challenge.targets.find((t) => t.acceptsItemId === item.id);
    return target !== undefined && state.placements[item.id] === target.id;
  });
}

export function buildAnswer(challenge: DragDropChallenge, state: DragDropState): DragDropAnswer {
  const placements: Record<string, string | null> = {};
  for (const item of challenge.items) placements[item.id] = state.placements[item.id] ?? null;
  return { placements };
}
