import {
  extractGestures,
  type InteractionSession,
  type PointerGesture,
  type PointerTimeline,
} from "@captchalab/captcha-core";
import { pointerXToTravelPx, type SliderLayout } from "@captchalab/captcha-plugins";

/**
 * Where the real handle was at time t, derived from recorded gestures (not from the pointer).
 *  - inside a handle drag: follows the pointer (same mapping as the live UI);
 *  - after a pointerup: stays at the release position;
 *  - after a cancel, or before any drag: at 0.
 * Hover movement never moves the handle. The reset caused by "Try again" is not an event, so
 * between attempts the handle stays at the previous release position (known replay limitation).
 */
export function createHandleReplay(
  session: InteractionSession,
  timeline: PointerTimeline,
  layout: SliderLayout,
  handleTarget: string,
): (t: number) => number {
  const drags: PointerGesture[] = extractGestures(session).filter((g) => g.target === handleTarget);
  return (t) => {
    let travel = 0;
    for (const g of drags) {
      if (g.startT > t) break;
      const pointerX =
        t <= g.endT ? timeline.at(t)?.x : g.events[g.events.length - 1]?.x;
      if (pointerX === undefined) continue;
      if (t <= g.endT) travel = pointerXToTravelPx(pointerX, layout);
      else travel = g.endedBy === "up" ? pointerXToTravelPx(pointerX, layout) : 0;
    }
    return travel;
  };
}
