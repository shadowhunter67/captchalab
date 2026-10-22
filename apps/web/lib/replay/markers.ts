/**
 * Session markers: semantic annotations recorded by the UI session layer, NOT input events.
 * They never enter the InteractionSession / event schema (so a UI action is never disguised as
 * user input) and they are not sent anywhere; replay and the timeline merely consult them.
 *
 * Only what Slider needs today. Generalize when a second CAPTCHA has its own marker.
 */
export interface AttemptResetMarker {
  type: "attempt-reset";
  /** ms on the session clock (same axis as event `t`), taken from recorder.elapsedMs(). */
  t: number;
  /** Normalized handle position the UI snapped to (0 for "Try again"). */
  position: number;
}

export type SessionMarker = AttemptResetMarker;
