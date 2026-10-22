import type { TimedPoint } from "../geometry";
import { accelerations, pointerTracks, segmentSpeeds } from "./motion";
import type { InteractionSession } from "../types/events";

/**
 * MOTION TIME-SERIES (raw series behind the aggregate motion features; no rendering concerns).
 *
 * Per track (a contiguous run of samples; see pointerTracks / gestureTrack):
 *   velocity      v_i = distance(p_{i-1}, p_i) / (t_i - t_{i-1}) * 1000      [px/s]
 *                 sample time = midpoint (t_{i-1} + t_i) / 2                  [ms since session start]
 *                 segments with dt <= 0 produce no sample.
 *   acceleration  a_j = (v_j - v_{j-1}) / (tMid_j - tMid_{j-1}) * 1000       [px/s^2], signed
 *                 sample time = (tMid_{j-1} + tMid_j) / 2: the centre of the interval it estimates.
 * These are exactly the values aggregated by extractMotionFeatures (maxVelocity, maxAcceleration,
 * velocityVariance), so the charts and the feature table cannot disagree.
 *
 * Tracks are never joined: velocity and acceleration are not computed across a gesture boundary
 * (pointerup/cancel, a new press, another pointerId, retry), so each track is its own segment.
 * A track with fewer than 2 distinct timestamps yields no velocity; fewer than 3, no acceleration.
 */
export interface SeriesSample {
  /** ms since session start */
  t: number;
  value: number;
}

export interface MotionSegment {
  /** px/s */
  velocity: SeriesSample[];
  /** px/s^2 */
  acceleration: SeriesSample[];
}

export interface MotionSeries {
  segments: MotionSegment[];
}

/** Pure: series for explicit tracks (e.g. only the drag gestures a plugin selected). */
export function buildMotionSeries(tracks: readonly (readonly TimedPoint[])[]): MotionSeries {
  return {
    segments: tracks.map((track) => {
      const speeds = segmentSpeeds(track);
      return {
        velocity: speeds.map((s) => ({ t: s.tMid, value: s.v })),
        acceleration: accelerations(speeds).map((a) => ({ t: a.t, value: a.a })),
      };
    }),
  };
}

/** Series over every per-contact track of the session, hover approach included. */
export function sessionMotionSeries(session: InteractionSession): MotionSeries {
  return buildMotionSeries(pointerTracks(session));
}
