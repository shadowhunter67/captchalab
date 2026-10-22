import {
  extractGestures,
  isKeyEvent,
  type GestureEnd,
  type InteractionSession,
  type PointerType,
} from "@captchalab/captcha-core";
import { CHECKBOX_ACTIVATION_KEY, CHECKBOX_TARGETS } from "./types";

export type CheckboxActivationEnd = GestureEnd;

/**
 * One press of the control, completed or not. The single definition of "activation" shared by the
 * feature extractor and by the web replay, so they cannot disagree. See the definitions in ./types.ts.
 */
export interface CheckboxActivation {
  input: "pointer" | "keyboard";
  /** Pointer activations only. */
  pointerType?: PointerType;
  pressT: number;
  /** Time of the last event of the press (the release for completed ones). */
  endT: number;
  /** Index in session.events of that last event; breaks ties between equal endT. */
  endIndex: number;
  /** "up" = completed (pointerup / keyup on the control). Others: cancel, interrupted, open. */
  end: CheckboxActivationEnd;
  completed: boolean;
}

/**
 * Every press of the control (any outcome), ordered by `endT`, ties in session event order
 * (earlier event first).
 *
 * Pointer: completed only if the gesture ends with a pointerup whose target is the control (defensive:
 * the UI only records events with that target, but imported sessions may not).
 * Keyboard: a second keydown of the key while it is already down is treated as auto-repeat of the
 * same hold (the first keydown stays the press time). A Space event on any other target while a press
 * is pending ends that press as "interrupted".
 */
export function extractCheckboxActivations(session: InteractionSession): CheckboxActivation[] {
  const out: CheckboxActivation[] = [];

  for (const g of extractGestures(session)) {
    if (g.target !== CHECKBOX_TARGETS.control) continue;
    const release = g.events[g.events.length - 1];
    const completed = g.endedBy === "up" && release?.target === CHECKBOX_TARGETS.control;
    out.push({
      input: "pointer",
      pointerType: g.pointerType,
      pressT: g.startT,
      endT: g.endT,
      endIndex: g.endIndex,
      end: g.endedBy === "up" && !completed ? "cancel" : g.endedBy,
      completed,
    });
  }

  let pending: { t: number; index: number } | null = null;
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.code !== CHECKBOX_ACTIVATION_KEY) return;
    const onControl = e.target === CHECKBOX_TARGETS.control;
    if (!onControl) {
      if (pending) {
        out.push({ input: "keyboard", pressT: pending.t, endT: pending.t, endIndex: pending.index, end: "interrupted", completed: false });
        pending = null;
      }
      return;
    }
    if (e.type === "keydown") {
      pending ??= { t: e.t, index }; // repeats keep the original press time
    } else if (pending) {
      out.push({ input: "keyboard", pressT: pending.t, endT: e.t, endIndex: index, end: "up", completed: true });
      pending = null;
    }
  });
  if (pending) {
    const last = pending as { t: number; index: number };
    out.push({ input: "keyboard", pressT: last.t, endT: last.t, endIndex: last.index, end: "open", completed: false });
  }

  return out.sort((a, b) => a.endT - b.endT || a.endIndex - b.endIndex);
}
