import { useState } from "react";
import type { InteractionEvent, InteractionSession } from "@captchalab/captcha-core";
import { stepSelection } from "./events";

export interface EventSelection {
  /** Index into session.events (the single source of truth for selection), or null. */
  index: number | null;
  event: InteractionEvent | null;
  total: number;
  select: (index: number | null) => void;
  previous: () => void;
  next: () => void;
  clear: () => void;
}

/**
 * Selection of one recorded event, bound to the session snapshot it was made on: a different
 * session always starts unselected, so a stale index can never point at an unrelated event.
 * CAPTCHA-agnostic; every Inspect page uses it.
 */
export function useEventSelection(session: InteractionSession): EventSelection {
  const [selection, setSelection] = useState<{ session: InteractionSession; index: number } | null>(null);
  const index = selection && selection.session === session ? selection.index : null;
  const total = session.events.length;
  const select = (next: number | null): void => setSelection(next === null ? null : { session, index: next });
  return {
    index,
    event: index === null ? null : (session.events[index] ?? null),
    total,
    select,
    previous: () => select(stepSelection(index, -1, total)),
    next: () => select(stepSelection(index, 1, total)),
    clear: () => select(null),
  };
}
