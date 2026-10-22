import { createPointerTimeline, type InteractionSession } from "@captchalab/captcha-core";
import { extractCheckboxActivations } from "@captchalab/captcha-plugins";

export interface CheckboxReplayState {
  checked: boolean;
  /** A pointer press is in progress. Independent of the keyboard: both can be held at once. */
  pointerPressed: boolean;
  /** Space is held. */
  keyPressed: boolean;
  /** Virtual pointer in control-relative px while a pointer is part of the recording, else null. */
  pointer: { x: number; y: number } | null;
}

export interface CheckboxReplayModel {
  /** Replay range (ms on the session clock), or null when there are no events to replay. */
  range: readonly [number, number] | null;
  at(t: number): CheckboxReplayState;
}

/**
 * Derived replay model for the checkbox: what the control looked like at time t.
 *   InteractionSession -> activations (same definition as the features) -> state(t)
 * unchecked -> pressed -> checked (pointer) or unchecked -> key held -> checked (keyboard). Focus is
 * not in the event schema, so none is invented. The checked state toggles when a COMPLETED activation
 * is released (parity from the events; an activation that sent no events is not replayable).
 */
export function createCheckboxReplay(session: InteractionSession): CheckboxReplayModel {
  const events = session.events;
  if (events.length === 0) return { range: null, at: () => ({ checked: false, pointerPressed: false, keyPressed: false, pointer: null }) };

  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  let firstPointerT = Number.POSITIVE_INFINITY;
  let lastPointerT = Number.NEGATIVE_INFINITY;
  for (const e of events) {
    start = Math.min(start, e.t);
    end = Math.max(end, e.t);
    if ("pointerId" in e) {
      firstPointerT = Math.min(firstPointerT, e.t);
      lastPointerT = Math.max(lastPointerT, e.t);
    }
  }
  // Never a zero-length range (the scrubber and clock need one). Events sharing a timestamp are not
  // distinguishable on a time axis: they all take effect at that instant (known limitation).
  if (end <= start) end = start + 1;

  const activations = extractCheckboxActivations(session);
  const completed = activations.filter((a) => a.completed);
  const timeline = createPointerTimeline(session);

  return {
    range: [start, end],
    at(t) {
      const checked = completed.filter((a) => a.endT <= t).length % 2 === 1;
      // Pressed from the press until the release/cancel; an unfinished press stays down.
      const holding = (input: "pointer" | "keyboard"): boolean =>
        activations.some((a) => a.input === input && a.pressT <= t && (a.end === "open" || t < a.endT));
      const p = t >= firstPointerT && t <= lastPointerT ? timeline.at(t) : null;
      return {
        checked,
        pointerPressed: holding("pointer"),
        keyPressed: holding("keyboard"),
        pointer: p ? { x: p.x, y: p.y } : null,
      };
    },
  };
}
