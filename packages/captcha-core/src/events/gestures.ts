import {
  isPointerEvent,
  type InteractionSession,
  type PointerInteractionEvent,
  type PointerType,
} from "../types/events";

export type GestureEnd =
  /** pointerup / touchend of the same pointerId. */
  | "up"
  /** pointercancel of the same pointerId. */
  | "cancel"
  /** A new pointerdown arrived for the same pointerId before any up/cancel (lost event). */
  | "interrupted"
  /** The session ended while the pointer was still down. */
  | "open";

/**
 * One contact: pointerdown -> (moves) -> up/cancel of the same pointerId.
 * Hover movement before the pointerdown is not part of a gesture.
 */
export interface PointerGesture {
  pointerId: number;
  pointerType: PointerType;
  /** Semantic target of the pointerdown (e.g. "slider-handle"). Moves/up targets are not used. */
  target: string | undefined;
  startT: number;
  /** Time of the last event in the gesture. */
  endT: number;
  /** Index in session.events of the last event; breaks ties between equal endT. */
  endIndex: number;
  endedBy: GestureEnd;
  /** down, moves, and the terminating up/cancel when present. */
  events: readonly PointerInteractionEvent[];
}

/**
 * Identity of one contact. Namespaced by event family and pointerType because Pointer Events
 * ids and legacy touch identifiers are different id spaces. Adapters should emit ONE family
 * per physical contact (prefer Pointer Events); duplicate families are not de-duplicated.
 */
export function contactKey(e: PointerInteractionEvent): string {
  const family = e.type.startsWith("touch") ? "touch" : "pointer";
  return `${family}:${e.pointerType}:${e.pointerId}`;
}

function isDown(t: PointerInteractionEvent["type"]): boolean {
  return t === "pointerdown" || t === "touchstart";
}

/** Gestures ordered by start time. Keyboard and click events are ignored. */
export function extractGestures(session: InteractionSession): PointerGesture[] {
  const active = new Map<string, { events: PointerInteractionEvent[]; lastIndex: number }>();
  const out: PointerGesture[] = [];

  const close = (events: PointerInteractionEvent[], lastIndex: number, endedBy: GestureEnd): void => {
    const first = events[0] as PointerInteractionEvent;
    const last = events[events.length - 1] as PointerInteractionEvent;
    out.push({
      pointerId: first.pointerId,
      pointerType: first.pointerType,
      target: first.target,
      startT: first.t,
      endT: last.t,
      endIndex: lastIndex,
      endedBy,
      events,
    });
  };

  session.events.forEach((e, index) => {
    if (!isPointerEvent(e) || e.type === "click") return;
    const key = contactKey(e);
    const cur = active.get(key);
    if (isDown(e.type)) {
      if (cur) close(cur.events, cur.lastIndex, "interrupted");
      active.set(key, { events: [e], lastIndex: index });
    } else if (cur) {
      cur.events.push(e);
      cur.lastIndex = index;
      if (e.type === "pointerup" || e.type === "touchend") {
        close(cur.events, index, "up");
        active.delete(key);
      } else if (e.type === "pointercancel") {
        close(cur.events, index, "cancel");
        active.delete(key);
      }
    }
  });
  for (const cur of active.values()) close(cur.events, cur.lastIndex, "open");
  return out.sort((a, b) => a.startT - b.startT);
}
