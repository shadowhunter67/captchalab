import { countDirectionChanges, pathLength, type TimedPoint } from "../geometry";
import { contactKey } from "../events/gestures";
import { max, mean, variance } from "../timing";
import { isPointerEvent, type InteractionSession } from "../types/events";

/**
 * Identify the shape/meaning of MotionFeatures. Bump the number when a definition below
 * changes meaning (schema), or the extractor id when only the algorithm changes (see FeatureSet).
 * Golden tests fail on any silent change.
 */
export const MOTION_FEATURES_SCHEMA = "motion@1";
export const MOTION_EXTRACTOR = "motion@1";

export interface BaseCaptchaFeatures {
  /** ms from session start to completion. */
  completionTime: number;
  eventCount: number;
}

/**
 * Pointer-motion features shared by pointer-driven CAPTCHAs. Plugins compose this
 * into their own feature interface; it is deliberately not part of the base.
 * All are descriptive measurements, not human/bot indicators.
 */
export interface MotionFeatures {
  /** ms from session start to the first event of any kind; null with no events. */
  reactionTime: number | null;
  /** ms from session start to the first pointerdown/touchstart/click; null if none. */
  timeToFirstClick: number | null;
  /** px. Summed path length over tracks (see pointerTracks). */
  pointerDistance: number;
  /** ms. Sum of per-track durations (contact-bounded tracks); 0 with fewer than 2 samples. */
  movementDuration: number;
  /** px/s. pointerDistance / movementDuration; 0 if movementDuration is 0. */
  meanVelocity: number;
  /** px/s. Max segment speed; segments with dt <= 0 are ignored. */
  maxVelocity: number;
  /** (px/s)^2. Population variance of segment speeds. */
  velocityVariance: number;
  /** px/s^2. Max |dv/dt| between consecutive segment midpoints, per track. */
  maxAcceleration: number;
  /** Turns sharper than 45 degrees between consecutive non-zero segments, per track. */
  directionChanges: number;
  /** px^2. Population variance of y over pointer samples. */
  verticalVariance: number;
  /** ms. Mean gap between consecutive pointerdown/touchstart; 0 with fewer than 2. */
  interClickTime: number;
}

/**
 * Per-contact movement tracks. Hover movement before a press is deliberately part of the
 * track (approach motion is signal; mouse hover is continuous). A track ends at pointerup/touchend/pointercancel of that
 * contact (see contactKey) or at a new press without one, so separate gestures (e.g. a slider retry) are never joined by a fabricated
 * segment and concurrent pointers are never interleaved. Synthetic `click` events are
 * excluded (they duplicate the preceding pointerup position). Samples sharing a timestamp
 * collapse to the last one, so distance, speed and mean velocity use the same positive-dt
 * segments. Tracks are ordered by start time.
 */
export function pointerTracks(session: InteractionSession): TimedPoint[][] {
  const open = new Map<string, { points: TimedPoint[]; down: boolean }>();
  const done: TimedPoint[][] = [];
  for (const e of session.events) {
    if (!isPointerEvent(e) || e.type === "click") continue;
    const key = contactKey(e);
    const isDown = e.type === "pointerdown" || e.type === "touchstart";
    let cur = open.get(key);
    if (cur && isDown && cur.down) {
      // New press without an up/cancel for the previous one: do not join the two attempts.
      done.push(cur.points);
      cur = undefined;
    }
    if (!cur) {
      cur = { points: [], down: false };
      open.set(key, cur);
    }
    if (isDown) cur.down = true;
    const last = cur.points[cur.points.length - 1];
    if (last && last.t === e.t) cur.points[cur.points.length - 1] = { t: e.t, x: e.x, y: e.y };
    else cur.points.push({ t: e.t, x: e.x, y: e.y });
    if (e.type === "pointerup" || e.type === "touchend" || e.type === "pointercancel") {
      done.push(cur.points);
      open.delete(key);
    }
  }
  for (const tr of open.values()) done.push(tr.points);
  return done.sort((p, q) => (p[0] as TimedPoint).t - (q[0] as TimedPoint).t);
}

export interface SpeedSample {
  t: number;
  /** midpoint time of the segment, ms */
  tMid: number;
  /** px/s */
  v: number;
}

export interface AccelerationSample {
  t: number;
  /** px/s^2, signed */
  a: number;
}

/** Segment speeds; tMid is the segment midpoint. Segments with dt <= 0 are skipped. */
export function segmentSpeeds(points: readonly TimedPoint[]): SpeedSample[] {
  const out: SpeedSample[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as TimedPoint;
    const b = points[i] as TimedPoint;
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    out.push({ t: b.t, tMid: (a.t + b.t) / 2, v: (Math.hypot(b.x - a.x, b.y - a.y) / dt) * 1000 });
  }
  return out;
}

/** dv/dt between consecutive segment midpoints (correct for irregular sampling). */
export function accelerations(speeds: readonly SpeedSample[]): AccelerationSample[] {
  const out: AccelerationSample[] = [];
  for (let i = 1; i < speeds.length; i++) {
    const p = speeds[i - 1] as SpeedSample;
    const c = speeds[i] as SpeedSample;
    const dt = c.tMid - p.tMid;
    if (dt <= 0) continue;
    out.push({ t: c.tMid, a: ((c.v - p.v) / dt) * 1000 });
  }
  return out;
}

export function extractMotionFeatures(session: InteractionSession): MotionFeatures {
  const tracks = pointerTracks(session);
  const speeds: SpeedSample[] = [];
  const accels: AccelerationSample[] = [];
  const ys: number[] = [];
  let distance = 0;
  let movementDuration = 0;
  let turns = 0;
  for (const tr of tracks) {
    const sp = segmentSpeeds(tr);
    speeds.push(...sp);
    accels.push(...accelerations(sp));
    ys.push(...tr.map((p) => p.y));
    distance += pathLength(tr);
    turns += countDirectionChanges(tr);
    if (tr.length > 1) movementDuration += (tr[tr.length - 1] as TimedPoint).t - (tr[0] as TimedPoint).t;
  }
  const downs = session.events.filter(
    (e) => isPointerEvent(e) && (e.type === "pointerdown" || e.type === "touchstart"),
  );
  const firstClick = session.events.find(
    (e) =>
      isPointerEvent(e) &&
      (e.type === "pointerdown" || e.type === "touchstart" || e.type === "click"),
  );
  const clickGaps: number[] = [];
  for (let i = 1; i < downs.length; i++) {
    clickGaps.push((downs[i] as { t: number }).t - (downs[i - 1] as { t: number }).t);
  }

  return {
    reactionTime: session.events[0]?.t ?? null,
    timeToFirstClick: firstClick?.t ?? null,
    pointerDistance: distance,
    movementDuration,
    meanVelocity: movementDuration > 0 ? (distance / movementDuration) * 1000 : 0,
    maxVelocity: max(speeds.map((s) => s.v)),
    velocityVariance: variance(speeds.map((s) => s.v)),
    maxAcceleration: max(accels.map((x) => Math.abs(x.a))),
    directionChanges: turns,
    verticalVariance: variance(ys),
    interClickTime: mean(clickGaps),
  };
}

export function extractBaseFeatures(session: InteractionSession): BaseCaptchaFeatures {
  return { completionTime: session.durationMs, eventCount: session.events.length };
}
