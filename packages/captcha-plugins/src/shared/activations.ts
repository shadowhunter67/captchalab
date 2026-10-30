import { extractGestures, isKeyEvent, type InteractionSession } from "@captchalab/captcha-core";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

export interface TimedActivation {
  id: string;
  t: number;
  index: number;
}

/**
 * Completed presses (pointerdown then pointerup on the same cell) and Space/Enter keydowns on cells whose semantic
 * target `parse` recognises, in event order. A press that is cancelled or released elsewhere is not an activation.
 */
export function extractCellActivations(session: InteractionSession, parse: (target: string | undefined) => string | null): TimedActivation[] {
  const out: TimedActivation[] = [];
  for (const g of extractGestures(session)) {
    const first = parse(g.target);
    const last = g.events[g.events.length - 1];
    const end = last ? parse(last.target) : null;
    if (first !== null && end === first && g.endedBy === "up") out.push({ id: first, t: g.endT, index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.type !== "keydown" || !ACTIVATION_KEYS.has(e.code)) return;
    const id = parse(e.target);
    if (id !== null) out.push({ id, t: e.t, index });
  });
  return out.sort((a, b) => a.t - b.t || a.index - b.index);
}

/** Time of the first press of any recognised cell (pointerdown or an activation key), even if it never completes. */
export function firstCellPress(session: InteractionSession, parse: (target: string | undefined) => string | null): number | null {
  const e = session.events.find(
    (x) => parse(x.target) !== null && ((!isKeyEvent(x) && x.type === "pointerdown") || (isKeyEvent(x) && x.type === "keydown" && ACTIVATION_KEYS.has(x.code))),
  );
  return e?.t ?? null;
}
