import {
  countDirectionChanges,
  extractGestures,
  gestureTrack,
  pathLength,
  type GestureEnd,
  type InteractionSession,
  type PointerInteractionEvent,
  type PointerType,
  type Point,
  type TimedPoint,
} from "@captchalab/captcha-core";
import { assertLayout, normalizedToPx } from "./geometry";
import { createInitialState, grabOffsetOf, heldCenterOf, resolveDrop, type DragDropState, type DropOutcome } from "./placement";
import { parseDragDropTarget, type DragDropChallenge, type DragDropLayout } from "./types";

export type DragAttemptOutcome = DropOutcome | "cancelled";

/** One drag of one item, with everything derived by replaying the session against the challenge. */
export interface DragAttempt {
  /** 1-based, by start time, over all attempts. */
  index: number;
  /** 1-based count of this item's attempts so far. */
  attemptOfItem: number;
  itemId: string;
  pointerId: number;
  pointerType: PointerType;
  startT: number;
  endT: number;
  /** Index in session.events of the attempt's last event. */
  endIndex: number;
  end: GestureEnd;
  /** Started while another attempt was active; ignored by the replay (outcome "cancelled"). */
  overlapped: boolean;
  outcome: DragAttemptOutcome;
  /** Target the item rests on after a release; null for a miss or a cancelled attempt. */
  targetId: string | null;
  /** pointerdown position minus item center before the drag, px. */
  grabOffset: Point;
  /** Item center (px, clamped to the surface) at each event of the attempt; same length as `events`. */
  centers: readonly TimedPoint[];
  /** Item center at release; null if not released. */
  releaseCenter: Point | null;
  /** Distance to the item's own target center at release, px; null if not released. */
  releaseError: number | null;
  /** Pointer path (gestureTrack rules) and its length / turns. */
  track: readonly TimedPoint[];
  distance: number;
  directionChanges: number;
  /** Where every item rests after this attempt. */
  stateAfter: DragDropState;
  events: readonly PointerInteractionEvent[];
}

export interface DragDropAnalysis {
  attempts: DragAttempt[];
  initialState: DragDropState;
  finalState: DragDropState;
}

/**
 * Replays the session against the challenge and layout. Pure and deterministic. Only gestures that
 * start on a known drag item count; attempts run in start order and are assumed not to overlap (the UI
 * allows one active drag).
 */
export function deriveDragAttempts(
  challenge: DragDropChallenge,
  layout: DragDropLayout,
  session: InteractionSession,
): DragDropAnalysis {
  assertLayout(layout);
  const itemIds = new Set(challenge.items.map((i) => i.id));
  const initialState = createInitialState(challenge);
  let state = initialState;
  const perItem = new Map<string, number>();
  const attempts: DragAttempt[] = [];
  /** Time the previous attempt's events ended: an attempt starting before it overlaps (not supported). */
  let busyUntil = Number.NEGATIVE_INFINITY;

  for (const g of extractGestures(session)) {
    const parsed = parseDragDropTarget(g.target);
    if (!parsed || parsed.kind !== "drag-item" || !itemIds.has(parsed.id)) continue;
    const itemId = parsed.id;
    const first = g.events[0];
    if (!first) continue;

    const startCenter = normalizedToPx(state.centers[itemId] as { x: number; y: number }, layout);
    const grabOffset = grabOffsetOf(startCenter, first);
    const centers = g.events.map((e) => ({ t: e.t, ...heldCenterOf(e, grabOffset, layout) }));

    // The UI allows ONE active drag. A drag that starts while another is still going (only possible in an
    // imported session) cannot be replayed in a consistent order, so it is treated as cancelled: it
    // changes nothing and is not counted as released.
    const overlaps = g.startT < busyUntil;
    busyUntil = g.endedBy === "open" ? Number.POSITIVE_INFINITY : Math.max(busyUntil, g.endT); // an unfinished drag blocks everything after it
    const released = g.endedBy === "up" && !overlaps;
    const lastCenter = centers[centers.length - 1] as TimedPoint;
    let outcome: DragAttemptOutcome = "cancelled";
    let targetId: string | null = null;
    let releaseError: number | null = null;
    if (released) {
      const res = resolveDrop(challenge, layout, state, itemId, { x: lastCenter.x, y: lastCenter.y });
      outcome = res.outcome;
      targetId = res.targetId;
      releaseError = res.releaseError;
      state = res.state;
    }

    const track = gestureTrack(g.events);
    const attemptOfItem = (perItem.get(itemId) ?? 0) + 1;
    perItem.set(itemId, attemptOfItem);
    attempts.push({
      index: attempts.length + 1,
      attemptOfItem,
      itemId,
      pointerId: g.pointerId,
      pointerType: g.pointerType,
      startT: g.startT,
      endT: g.endT,
      endIndex: g.endIndex,
      end: g.endedBy,
      overlapped: overlaps,
      outcome,
      targetId,
      grabOffset,
      centers,
      releaseCenter: released ? { x: lastCenter.x, y: lastCenter.y } : null,
      releaseError,
      track,
      distance: pathLength(track),
      directionChanges: countDirectionChanges(track),
      stateAfter: state,
      events: g.events,
    });
  }
  return { attempts, initialState, finalState: state };
}
