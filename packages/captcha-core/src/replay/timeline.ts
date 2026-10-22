import { isPointerEvent, type InteractionSession } from "../types/events";
import type { TimedPoint } from "../geometry";

export interface VirtualPointer {
  x: number;
  y: number;
  /** True between a pointerdown/touchstart and the matching pointerup/touchend. */
  down: boolean;
}

export interface PointerTimeline {
  durationMs: number;
  /** Interpolated pointer state at time t, or null if the session has no pointer samples. */
  at(t: number): VirtualPointer | null;
}

type Sample = TimedPoint & { down: boolean };

/**
 * Pure, renderer-agnostic timeline built from a recorded session.
 * Position is linearly interpolated between samples and clamped to the first/last sample.
 * Never dispatches DOM events; a renderer (SVG/Canvas) draws the virtual pointer.
 */
export function createPointerTimeline(session: InteractionSession): PointerTimeline {
  const samples: Sample[] = [];
  let down = false;
  for (const e of session.events) {
    if (!isPointerEvent(e)) continue;
    if (e.type === "pointerdown" || e.type === "touchstart") down = true;
    else if (e.type === "pointerup" || e.type === "touchend" || e.type === "pointercancel") down = false;
    samples.push({ t: e.t, x: e.x, y: e.y, down });
  }

  return {
    durationMs: session.durationMs,
    at(t) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (!first || !last) return null;
      if (t <= first.t) return { x: first.x, y: first.y, down: first.down };
      if (t >= last.t) return { x: last.x, y: last.y, down: last.down };
      // Binary search: last sample with s.t <= t.
      let lo = 0;
      let hi = samples.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((samples[mid] as Sample).t <= t) lo = mid;
        else hi = mid - 1;
      }
      const a = samples[lo] as Sample;
      const b = samples[lo + 1] as Sample;
      const span = b.t - a.t;
      const k = span > 0 ? (t - a.t) / span : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, down: a.down };
    },
  };
}
