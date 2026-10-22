import {
  extractGestures,
  type InteractionSession,
  type PointerGesture,
  type PointerTimeline,
} from "@captchalab/captcha-core";
import { pointerXToTravelPx, positionToTravelPx, type SliderLayout } from "@captchalab/captcha-plugins";
import type { SessionMarker } from "@/lib/replay/markers";

/**
 * Derived replay model for the Slider: where the real handle was at time t.
 *   InteractionSession + session markers -> handleTravelAt(t) -> renderer
 *
 *  - inside a handle drag: follows the pointer (same mapping as the live UI);
 *  - after a pointerup: stays at the release position;
 *  - after a cancel, or before any drag: at 0;
 *  - an "attempt-reset" marker (Try again) snaps the handle to the marker's position until the next drag.
 * Hover movement never moves the handle. Ordering on equal timestamps: a marker takes effect before a
 * drag that starts at the same time (the reset happened first), and after a drag that ended then.
 */
export function createHandleReplay(
  session: InteractionSession,
  timeline: PointerTimeline,
  layout: SliderLayout,
  handleTarget: string,
  markers: readonly SessionMarker[] = [],
): (t: number) => number {
  const drags: PointerGesture[] = extractGestures(session).filter((g) => g.target === handleTarget);
  const resets = [...markers].filter((m) => m.type === "attempt-reset").sort((a, b) => a.t - b.t);

  return (t) => {
    let drag: PointerGesture | undefined;
    for (const g of drags) {
      if (g.startT > t) break;
      drag = g;
    }
    let reset: SessionMarker | undefined;
    for (const m of resets) {
      if (m.t > t) break;
      reset = m;
    }
    // A reset after the latest drag started wins; a drag starting at or after the reset wins.
    if (reset && (!drag || reset.t > drag.startT)) return positionToTravelPx(reset.position, layout);
    if (!drag) return 0;
    if (t <= drag.endT) {
      const x = timeline.at(t)?.x;
      return x === undefined ? 0 : pointerXToTravelPx(x, layout);
    }
    const last = drag.events[drag.events.length - 1];
    if (drag.endedBy === "up" && last) return pointerXToTravelPx(last.x, layout);
    return 0;
  };
}
