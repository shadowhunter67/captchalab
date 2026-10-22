import {
  extractGestures,
  isKeyEvent,
  type InteractionSession,
  type Point,
} from "@captchalab/captcha-core";
import {
  KEY_BURST_GAP_MS,
  KEY_STEP_DEG,
  ROTATION_KEYS,
  ROTATION_TARGET,
  type RotationChallenge,
  type RotationFeatureContext,
} from "./types";

/** Maps any angle into [0, 360). */
export function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Maps an angle difference into [-180, 180): the shortest signed turn. */
export function wrap180(deg: number): number {
  return normalize360(deg + 180) - 180;
}

/** Shortest angular distance in [0, 180]. 359 and 0 are 1 degree apart. */
export function shortestAngularDistance(a: number, b: number): number {
  return Math.abs(wrap180(a - b));
}

/** Clockwise-positive angle of a pointer around a center, degrees (screen y points down). */
export function pointerAngleDeg(p: Point, center: Point): number {
  return (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
}

/** Turn caused by a pointer moving from `prev` to `next` around `center`. */
export function pointerTurn(prev: Point, next: Point, center: Point): number {
  return wrap180(pointerAngleDeg(next, center) - pointerAngleDeg(prev, center));
}

export function keyTurn(code: string): number {
  return code === ROTATION_KEYS.clockwise ? KEY_STEP_DEG : code === ROTATION_KEYS.counterClockwise ? -KEY_STEP_DEG : 0;
}

export interface TurnStep {
  t: number;
  /** Signed turn, degrees. */
  delta: number;
  /** ms since the previous sample of the same drag; 0 for key presses and the first step of a duplicate-time pair. */
  dt: number;
}

export interface PointerDrag {
  startT: number;
  endT: number;
  released: boolean;
  steps: TurnStep[];
}

export interface RotationAnalysis {
  initialAngle: number;
  /** Final simulated angle in [0, 360). */
  finalAngle: number;
  drags: PointerDrag[];
  keySteps: TurnStep[];
  /** Number of keyboard bursts (arrow presses separated by more than KEY_BURST_GAP_MS). */
  keyBursts: number;
  /** Times of arrow key events (down and up), for the rotation duration. */
  keyEventTimes: number[];
  /** Angle shown after each change, for replay: [{t, angle}], starting with the initial angle. Includes the
   *  turning of cancelled drags and their restore (the features and final angle exclude them). */
  timeline: { t: number; angle: number }[];
}

/** Replays the session against the challenge. Pure; the UI applies the same turn rules live. */
export function deriveRotation(
  challenge: RotationChallenge,
  { center }: RotationFeatureContext,
  session: InteractionSession,
): RotationAnalysis {
  const drags: PointerDrag[] = [];
  const events: { t: number; delta: number; order: number }[] = []; // applied turns, for the final angle and replay
  for (const g of extractGestures(session)) {
    if (g.target !== ROTATION_TARGET) continue;
    const steps: TurnStep[] = [];
    for (let i = 1; i < g.events.length; i++) {
      const a = g.events[i - 1];
      const b = g.events[i];
      if (a && b) steps.push({ t: b.t, delta: pointerTurn(a, b, center), dt: Math.max(0, b.t - a.t) });
    }
    const released = g.endedBy === "up";
    drags.push({ startT: g.startT, endT: g.endT, released, steps });
    if (released) for (const s of steps) events.push({ t: s.t, delta: s.delta, order: g.endIndex });
  }

  const keySteps: TurnStep[] = [];
  const keyEventTimes: number[] = [];
  let lastKeyT = Number.NEGATIVE_INFINITY;
  let keyBursts = 0;
  for (const e of session.events) {
    if (!isKeyEvent(e) || e.target !== ROTATION_TARGET || keyTurn(e.code) === 0) continue;
    keyEventTimes.push(e.t);
    if (e.type !== "keydown") continue;
    if (e.t - lastKeyT > KEY_BURST_GAP_MS) keyBursts++;
    lastKeyT = e.t;
    const delta = keyTurn(e.code);
    keySteps.push({ t: e.t, delta, dt: 0 });
    events.push({ t: e.t, delta, order: 0 });
  }

  events.sort((a, b) => a.t - b.t || a.order - b.order);
  let angle = normalize360(challenge.initialAngle);
  const timeline = [{ t: 0, angle }];
  for (const ev of events) {
    angle = normalize360(angle + ev.delta);
    timeline.push({ t: ev.t, angle });
  }
  // Replay shows what the user saw: a cancelled drag turned the object and then it went back. Its steps
  // are drawn from the angle the object had when the drag started, followed by the restore.
  const angleAt = (t: number): number => {
    let a = normalize360(challenge.initialAngle);
    for (const p of timeline) if (p.t <= t) a = p.angle;
    return a;
  };
  const shown: { t: number; angle: number }[] = [...timeline];
  for (const d of drags) {
    if (d.released) continue;
    const base = angleAt(d.startT);
    let a = base;
    for (const s of d.steps) {
      a = normalize360(a + s.delta);
      shown.push({ t: s.t, angle: a });
    }
    shown.push({ t: d.endT, angle: base });
  }
  const ordered = shown.map((p, i) => ({ p, i })).sort((x, y) => x.p.t - y.p.t || x.i - y.i).map((x) => x.p);
  return { initialAngle: normalize360(challenge.initialAngle), finalAngle: angle, drags, keySteps, keyBursts, keyEventTimes, timeline: ordered };
}
