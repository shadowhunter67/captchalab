import type { ChallengeConfig, BaseCaptchaFeatures, MotionFeatures } from "@captchalab/captcha-core";

export const SLIDER_ID = "slider" as const;

/** Semantic event targets. Independent of DOM ids / CSS classes. */
export const SLIDER_TARGETS = {
  track: "slider-track",
  handle: "slider-handle",
} as const;

/**
 * COORDINATE MODEL
 * ----------------
 * Challenge and answer use a normalized *handle position* p in [0, 1] along the handle's travel:
 *   p = 0  handle fully left (its left edge at the track's left edge)
 *   p = 1  handle fully right (its right edge at the track's right edge)
 * Normalizing makes a challenge independent of rendered size; the UI maps p to pixels.
 *
 * Pointer pixels -> travel pixels (used only by feature extraction), given a SliderLayout:
 *   travel   = trackWidth - handleWidth
 *   u(x)     = clamp(x - trackLeft - handleWidth / 2, 0, travel)     [px along travel]
 * i.e. the handle is assumed to be centered under the pointer while dragging; the UI must follow
 * the pointer with the same mapping, otherwise features describe the pointer, not the handle.
 * Known limitation: an off-center grab adds a constant offset to releaseError/overshoot unless the
 * UI centers the handle under the pointer (a grab offset in SliderFeatureContext is future work).
 * The challenge target in the same units is  targetPx = target * travel.
 */
export interface SliderChallenge {
  id: string;
  /** Target handle position, normalized [0, 1]. */
  target: number;
  /** Accepted |answer.position - target|, normalized (same units as target). */
  tolerance: number;
  /** How it was generated (variant, difficulty, parameters). Absent on hand-built challenges. */
  config?: ChallengeConfig;
}

/** Final state of the solution only. The trajectory lives in the InteractionSession. */
export interface SliderAnswer {
  /** Final handle position, normalized [0, 1]. */
  position: number;
}

/** Rendered geometry in challenge-surface CSS px (same space as event x/y). */
export interface SliderLayout {
  trackLeft: number;
  trackWidth: number;
  handleWidth: number;
}

export interface SliderFeatureContext {
  layout: SliderLayout;
}

/**
 * SLIDER FEATURE DEFINITIONS (schema slider@1). Units are px along travel unless stated.
 *
 * Slider attempt: a PointerGesture whose pointerdown target is SLIDER_TARGETS.handle
 * (see extractGestures; keyed by pointerId, so other pointers/targets are ignored).
 * Completed attempt: one that ended with pointerup. Cancelled/interrupted/open ones are not.
 * Selected attempt: the completed attempt with the greatest endT (ties: the one whose pointerup
 * appears later in session.events). Assumes event times are non-decreasing (recorder guarantee). Earlier
 * attempts are never merged into it. With no completed attempt, attempt-based features are null.
 *
 * numberOfAttempts   count of all handle gestures (completed or not).
 * dragDuration  ms   selected.endT - selected.startT  (pointerup time - pointerdown time; 0 allowed).
 * releaseError  px   | u(x_up) - targetPx |, x_up = x of the selected attempt's pointerup.
 * overshoot     px   Let s = u(x_down), d = sign(targetPx - s) (direction toward target).
 *                    overshoot = max(0, max over the attempt's samples of d * (u(x_i) - targetPx)).
 *                    I.e. the farthest the pointer got *past* the target, measured in the direction
 *                    from the starting position toward the target (not the first movement), up to
 *                    and including the release sample. 280->305->298->301 with target 300
 *                    gives 5. Approaching from the right (d = -1) is symmetric. If s == targetPx
 *                    (d = 0) there is no defined direction and overshoot is 0.
 *
 * Motion features (MotionFeatures) are computed over the whole session, not the selected attempt.
 * These are descriptive measurements, not indicators of human or automated input.
 */
export interface SliderFeatures extends BaseCaptchaFeatures, MotionFeatures {
  numberOfAttempts: number;
  dragDuration: number | null;
  releaseError: number | null;
  overshoot: number | null;
}

export const SLIDER_FEATURES_SCHEMA = "slider@1";
export const SLIDER_EXTRACTOR = "slider@1";
