import type { BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";

export const DRAG_DROP_ID = "drag-drop" as const;

export type ShapeKind = "circle" | "square" | "triangle";

/** Fractions of the surface: x of its width, y of its height, both in [0, 1]. */
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface DragDropItem {
  id: string;
  kind: ShapeKind;
  /** Initial CENTER of the item. */
  start: NormalizedPoint;
}

export interface DragDropTarget {
  id: string;
  /** The one item that belongs here. */
  acceptsItemId: string;
  /** CENTER of the drop area. */
  position: NormalizedPoint;
}

/**
 * COORDINATE MODEL
 * ----------------
 * Positions are normalized CENTERS (x of surface width, y of surface height), so a challenge is
 * independent of rendered size. Sizes are fractions of `scale = min(surface width, surface height)`:
 *   itemSize      item width/height in px   = itemSize * scale
 *   dropTolerance hit radius of a target    = dropTolerance * scale
 * The UI maps these to pixels with a DragDropLayout (the measured surface size). Pointer coordinates in
 * events are CSS px relative to the surface's top-left corner.
 *
 * The challenge holds no interaction history and no DOM information.
 */
export interface DragDropChallenge {
  id: string;
  items: readonly DragDropItem[];
  targets: readonly DragDropTarget[];
  itemSize: number;
  dropTolerance: number;
}

/**
 * Final state only: which target each item sits on, or null when it is not on a target.
 * Keys are item ids. The trajectory lives in the InteractionSession.
 */
export interface DragDropAnswer {
  placements: Record<string, string | null>;
}

/** Measured surface size in CSS px (same space as event x/y). */
export interface DragDropLayout {
  width: number;
  height: number;
}

export interface DragDropFeatureContext {
  layout: DragDropLayout;
}

/**
 * SEMANTIC TARGETS. Events carry a structured id, never a selector or class name:
 *   "drag-item:<itemId>"   the draggable (pointer capture makes it the target of every event of a drag)
 *   "drop-target:<targetId>" reserved for events on a drop area
 *   "drag-surface"         the surface itself
 * Ids match ID_PATTERN so a target string parses back unambiguously.
 */
export const DRAG_SURFACE_TARGET = "drag-surface" as const;
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function makeDragItemTarget(itemId: string): string {
  assertId(itemId);
  return `drag-item:${itemId}`;
}

export function makeDropTarget(targetId: string): string {
  assertId(targetId);
  return `drop-target:${targetId}`;
}

export type ParsedDragDropTarget =
  | { kind: "drag-item"; id: string }
  | { kind: "drop-target"; id: string }
  | { kind: "drag-surface" };

/** Returns null for anything that is not a well-formed semantic target. */
export function parseDragDropTarget(target: string | undefined): ParsedDragDropTarget | null {
  if (target === undefined) return null;
  if (target === DRAG_SURFACE_TARGET) return { kind: "drag-surface" };
  const i = target.indexOf(":");
  if (i < 0) return null;
  const kind = target.slice(0, i);
  const id = target.slice(i + 1);
  if (!ID_PATTERN.test(id)) return null;
  if (kind === "drag-item") return { kind: "drag-item", id };
  if (kind === "drop-target") return { kind: "drop-target", id };
  return null;
}

function assertId(id: string): void {
  if (!ID_PATTERN.test(id)) throw new RangeError(`Invalid drag-drop id: ${JSON.stringify(id)}`);
}

/**
 * DRAG & DROP FEATURE DEFINITIONS (schema drag-drop@1). Times are ms on the session clock, distances px.
 *
 * Drag attempt: a PointerGesture (extractGestures) whose pointerdown target is "drag-item:<id>" for an
 * item of the challenge. Attempts are ordered by start time. Other targets/pointers are ignored.
 *
 * The extractor replays the session against the challenge and the layout (the same pure rules the UI
 * uses, see placement.ts):
 *  - grab offset = pointerdown position - item center before the drag; while dragging, item center =
 *    pointer - grab offset, clamped to the surface;
 *  - on pointerup, the item center is hit-tested: the nearest target whose area (radius
 *    dropTolerance*scale) contains it. A hit snaps the item to that target ("correct" when the target
 *    accepts this item, else "wrong-target"); an item already on that target is sent back to its start.
 *    No hit = "miss": the item returns to where it was before the drag. Hit testing uses geometry,
 *    never the DOM event target.
 *  - a gesture that does not end in a pointerup (pointercancel, interrupted by a new press, never
 *    released) is "cancelled": the item returns, nothing is dropped. So is a drag that starts while
 *    another is still active (the UI allows one drag at a time; overlapping ones only occur in imported
 *    sessions and cannot be replayed in a consistent order).
 *  - the session is analyzed at ONE layout (the context). Pixel coordinates recorded at a different surface
 *    size are reinterpreted, so a resize between attempts makes geometry-based features approximate. The
 *    surface must report coordinates and its size in the same post-transform space (CSS transforms, rotation
 *    or non-uniform scaling are not corrected).
 *
 * Released attempt: one that ended with a pointerup and was not overlapped (outcome correct / wrong-target / miss).
 *
 * reactionTime          ms  Start of the first drag attempt (pointerdown on a draggable). Hover is not recorded
 *                           by this CAPTCHA. null if there was none.
 * timeToAllCorrect      ms  Release time of the attempt after which every item is on its matching target and
 *                           stays so until the end of the session (the earliest such attempt). null if the final
 *                           state is not all-correct. (BaseCaptchaFeatures.completionTime is the whole session.)
 * numberOfDragAttempts      All attempts (released and cancelled).
 * successfulDropCount       Released attempts with outcome "correct".
 * failedDropCount           Released attempts with outcome "wrong-target" or "miss".
 * cancelledDragCount        Attempts that did not end in a release. Never counted as failed drops.
 * totalDragDuration     ms  Sum of (release - press) over released attempts. null with none.
 * meanDragDuration      ms  totalDragDuration / released attempts. null with none.
 * totalDragDistance     px  Sum of pointer path length over released attempts (gestureTrack + pathLength,
 *                           the same sample rules as the motion features). null with none.
 * meanDragDistance      px  totalDragDistance / released attempts. null with none.
 * meanReleaseError      px  Mean distance, over released attempts, between the item center at release and the
 *                           center of the item's OWN target (known even when it was dropped elsewhere).
 *                           null with none. maxReleaseError is the largest.
 * directionChanges          Sum of turns sharper than 45 degrees (core countDirectionChanges) over released
 *                           attempts' pointer tracks.
 * inputModality             Session modality (core inferModality), over all events.
 *
 * Verification is separate and never consults these. They are descriptive measurements of one
 * interaction, not indicators of human or automated input.
 */
export interface DragDropFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToAllCorrect: number | null;
  numberOfDragAttempts: number;
  successfulDropCount: number;
  failedDropCount: number;
  cancelledDragCount: number;
  totalDragDuration: number | null;
  meanDragDuration: number | null;
  totalDragDistance: number | null;
  meanDragDistance: number | null;
  meanReleaseError: number | null;
  maxReleaseError: number | null;
  directionChanges: number;
  inputModality: InputModality;
}

export const DRAG_DROP_FEATURES_SCHEMA = "drag-drop@1";
export const DRAG_DROP_EXTRACTOR = "drag-drop@1";
