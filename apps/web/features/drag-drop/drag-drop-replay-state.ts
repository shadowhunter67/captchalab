import type { InteractionSession, Point } from "@captchalab/captcha-core";
import {
  deriveDragAttempts,
  normalizedToPx,
  type DragAttempt,
  type DragDropChallenge,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { OUTCOME_TEXT, attemptLabel } from "./drag-drop-view-data";

export interface ReplayItemState {
  center: Point;
  /** Held by the pointer. */
  lifted: boolean;
}

export interface DragDropReplayState {
  items: Readonly<Record<string, ReplayItemState>>;
  /** Virtual pointer (surface px) while a drag is in progress, else null. */
  pointer: Point | null;
  /** What just happened, for sighted and screen-reader users alike (text, not color). */
  caption: string;
}

export interface DragDropReplayModel {
  /** Replay range (ms on the session clock), or null when there were no drags to replay. */
  range: readonly [number, number] | null;
  at(t: number): DragDropReplayState;
}

/** Linear interpolation over time-ordered points, clamped at both ends. */
function interpolate(points: readonly { t: number; x: number; y: number }[], t: number): Point {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return { x: 0, y: 0 };
  if (t <= first.t) return { x: first.x, y: first.y };
  if (t >= last.t) return { x: last.x, y: last.y };
  let i = 1;
  while (i < points.length - 1 && (points[i] as { t: number }).t < t) i++;
  const a = points[i - 1] as { t: number; x: number; y: number };
  const b = points[i] as { t: number; x: number; y: number };
  const span = b.t - a.t;
  const k = span > 0 ? (t - a.t) / span : 1;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/**
 * Derived replay model: where every item and the pointer were at time t.
 *   InteractionSession + challenge + layout -> attempts (the plugin's rules) -> state(t)
 *  - during an attempt the item follows pointer - grab offset (clamped), exactly as in the live UI;
 *  - at its release it snaps onto the target it was dropped on, or returns to where it was before the drag
 *    (a miss or a cancel), because that is the state the plugin derived after the attempt;
 *  - an attempt that never ended stays in the air.
 * No DOM events, no real component is driven.
 */
export function createDragDropReplay(
  challenge: DragDropChallenge,
  layout: DragDropLayout,
  session: InteractionSession,
): DragDropReplayModel {
  const { attempts, initialState } = deriveDragAttempts(challenge, layout, session);
  if (attempts.length === 0) {
    return { range: null, at: () => ({ items: {}, pointer: null, caption: "" }) };
  }
  const start = Math.min(...attempts.map((a) => a.startT));
  let end = Math.max(...attempts.map((a) => a.endT));
  if (end <= start) end = start + 1; // never a zero-length range

  const byItem = new Map<string, DragAttempt[]>();
  for (const a of attempts) byItem.set(a.itemId, [...(byItem.get(a.itemId) ?? []), a]);
  const active = (a: DragAttempt, t: number): boolean => a.startT <= t && (a.end === "open" || t < a.endT);

  return {
    range: [start, end],
    at(t) {
      const items: Record<string, ReplayItemState> = {};
      let pointer: Point | null = null;
      for (const item of challenge.items) {
        const mine = byItem.get(item.id) ?? [];
        const held = mine.find((a) => active(a, t));
        if (held) {
          const c = interpolate(held.centers, t);
          items[item.id] = { center: c, lifted: true };
          pointer = interpolate(held.events, t);
          continue;
        }
        // Rest position = the item's center in the state after the latest finished attempt of ANY item
        // (a drop can also send another item back to its start).
        let rest = normalizedToPx(initialState.centers[item.id] as { x: number; y: number }, layout);
        for (const a of attempts) {
          // Overlapped attempts (imported sessions) were ignored by the rules; their carried state may already
          // contain a later release, so they must not move anything.
          if (!a.overlapped && a.endT <= t) rest = normalizedToPx(a.stateAfter.centers[item.id] as { x: number; y: number }, layout);
        }
        items[item.id] = { center: rest, lifted: false };
      }

      let caption = "";
      const latest = [...attempts].reverse().find((a) => a.startT <= t);
      if (latest) {
        caption = active(latest, t)
          ? `${attemptLabel(challenge, latest)}: dragging`
          : `${attemptLabel(challenge, latest)}: ${OUTCOME_TEXT[latest.outcome]}`;
      }
      return { items, pointer, caption };
    },
  };
}
