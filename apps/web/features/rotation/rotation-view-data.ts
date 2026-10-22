import type { InteractionSession, Point, SeriesSample } from "@captchalab/captcha-core";
import { deriveRotation, type RotationAnalysis, type RotationChallenge, type RotationFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** Which numbers the generic MetricTable shows for the rotation CAPTCHA. Null shows as a dash. */
export function rotationMetrics(f: RotationFeatures): InspectMetric[] {
  return [
    { id: "reactionTime", label: "Reaction time", value: f.reactionTime, unit: "ms", hint: "to first input" },
    { id: "rotationDuration", label: "Rotation duration", value: f.rotationDuration, unit: "ms", hint: "first input to last" },
    { id: "angularDistance", label: "Angular distance", value: f.angularDistance, unit: "deg", hint: "total turning" },
    { id: "meanAngularVelocity", label: "Mean angular velocity", value: f.meanAngularVelocity, unit: "deg/s", hint: "pointer drags" },
    { id: "maxAngularVelocity", label: "Max angular velocity", value: f.maxAngularVelocity, unit: "deg/s", hint: "pointer drags" },
    { id: "angularCorrections", label: "Angular corrections", value: f.angularCorrections, unit: "count", description: "Reversals of turning direction." },
    { id: "finalAngularError", label: "Final angular error", value: f.finalAngularError, unit: "deg", hint: "from upright" },
    { id: "attemptCount", label: "Attempts", value: f.attemptCount, unit: "count", description: "Pointer drags plus keyboard bursts." },
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    { id: "completionTime", label: "Session duration", value: f.completionTime, unit: "ms", hint: "since challenge shown" },
    { id: "inputModality", label: "Input modality", text: f.inputModality },
  ];
}

/** Signed angular velocity (deg/s) over each released pointer drag; one segment per drag. */
export function angularVelocitySegments(analysis: RotationAnalysis): SeriesSample[][] {
  return analysis.drags
    .filter((d) => d.released)
    .map((d) => d.steps.filter((s) => s.dt > 0).map((s) => ({ t: s.t - s.dt / 2, value: (s.delta / s.dt) * 1000 })));
}

export function dragDomain(analysis: RotationAnalysis): [number, number] | null {
  const drags = analysis.drags.filter((d) => d.released);
  if (drags.length === 0) return null;
  return [Math.min(...drags.map((d) => d.startT)), Math.max(...drags.map((d) => d.endT))];
}

export interface RotationReplayModel {
  range: readonly [number, number] | null;
  /** Object angle (degrees) at time t: held between recorded turns. */
  at(t: number): number;
}

/** Derived replay: the angle the object had at each moment, from the same simulation the features use. */
export function createRotationReplay(challenge: RotationChallenge, center: Point, session: InteractionSession): RotationReplayModel {
  const a = deriveRotation(challenge, { center }, session);
  const times = session.events.filter((e) => e.target === "rotation-object").map((e) => e.t);
  if (times.length === 0) return { range: null, at: () => a.initialAngle };
  const start = Math.min(...times);
  let end = Math.max(...times);
  if (end <= start) end = start + 1;
  return {
    range: [start, end],
    at(t) {
      let angle = a.initialAngle;
      for (const p of a.timeline) if (p.t <= t) angle = p.angle;
      return angle;
    },
  };
}
