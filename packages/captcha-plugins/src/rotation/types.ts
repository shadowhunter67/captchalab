import type { ChallengeConfig, BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";

export const ROTATION_ID = "rotation" as const;
/** Semantic target of every pointer and key event of this CAPTCHA. */
export const ROTATION_TARGET = "rotation-object" as const;
/** Keyboard rotation: each keydown (auto-repeat included) turns the object by KEY_STEP_DEG. */
export const ROTATION_KEYS = { counterClockwise: "ArrowLeft", clockwise: "ArrowRight" } as const;
export const KEY_STEP_DEG = 5;
/** Key presses further apart than this start a new keyboard "burst" (one attempt). */
export const KEY_BURST_GAP_MS = 1000;

/**
 * Angles are degrees, clockwise-positive (the screen's y axis points down, so atan2(dy, dx) is clockwise).
 * The object is shown rotated by `initialAngle`; the user must turn it to `targetAngle` (upright, 0).
 */
export interface RotationChallenge {
  id: string;
  initialAngle: number;
  targetAngle: number;
  /** Accepted shortest angular distance to the target, degrees (inclusive). */
  tolerance: number;
  /** How it was generated (variant, difficulty, parameters). Absent on hand-built challenges. */
  config?: ChallengeConfig;
}

/** Final angle only, degrees (any real number; it is wrapped for comparison). */
export interface RotationAnswer {
  angle: number;
}

/** Where the object's center is, in surface px (same space as event x/y). Needed to turn pointer positions into angles. */
export interface RotationFeatureContext {
  center: { x: number; y: number };
}

/**
 * ROTATION FEATURE DEFINITIONS (schema rotation@1). Times ms, angles degrees, velocities deg/s.
 *
 * Simulation (angles.ts, the same rules the UI uses): the angle starts at initialAngle.
 *  - A pointer drag is a gesture whose pointerdown target is ROTATION_TARGET. Each consecutive pair of its
 *    events turns the object by wrap180(angle(p_i) - angle(p_{i-1})), where angle(p) = atan2 of the pointer
 *    relative to the center. The object is rotated relative to where it was grabbed (it never snaps to the pointer).
 *  - A drag that ends with pointercancel / is interrupted / never released is discarded: the angle goes back
 *    to what it was before the drag, and it contributes only to attemptCount.
 *  - Each keydown of ArrowRight / ArrowLeft on the object turns it by +/- KEY_STEP_DEG.
 *
 * reactionTime          ms   First pointerdown on the object or arrow keydown. null if none.
 * rotationDuration      ms   From that first input to the last event of a released drag or the last arrow key
 *                            event. null if none.
 * angularDistance       deg  Total absolute turning: sum of |step| over released drags and key presses.
 * meanAngularVelocity   deg/s Pointer only: total |turning| of released drags / total time of those drags. null if none.
 * maxAngularVelocity    deg/s Pointer only: largest |step| / dt over released-drag steps with dt > 0. null if none.
 * angularCorrections         Reversals of turning direction between consecutive non-zero steps, inside one drag or
 *                            across consecutive key presses. A drag boundary resets the direction.
 * finalAngularError     deg  Shortest angular distance between the final simulated angle and the target.
 * attemptCount               Pointer drags (any outcome) + keyboard bursts.
 * inputModality              Session modality (core inferModality).
 *
 * Descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface RotationFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  rotationDuration: number | null;
  angularDistance: number;
  meanAngularVelocity: number | null;
  maxAngularVelocity: number | null;
  angularCorrections: number;
  finalAngularError: number;
  attemptCount: number;
  inputModality: InputModality;
}

export const ROTATION_FEATURES_SCHEMA = "rotation@1";
export const ROTATION_EXTRACTOR = "rotation@1";
