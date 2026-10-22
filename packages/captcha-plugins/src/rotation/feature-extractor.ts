import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  isKeyEvent,
  isPointerEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { deriveRotation, keyTurn, shortestAngularDistance, type TurnStep } from "./angles";
import {
  ROTATION_EXTRACTOR,
  ROTATION_FEATURES_SCHEMA,
  ROTATION_TARGET,
  type RotationChallenge,
  type RotationFeatureContext,
  type RotationFeatures,
} from "./types";

function reversals(steps: readonly TurnStep[]): number {
  let prev = 0;
  let n = 0;
  for (const s of steps) {
    if (Math.abs(s.delta) < 1e-9) continue;
    const sign = Math.sign(s.delta);
    if (prev !== 0 && sign !== prev) n++;
    prev = sign;
  }
  return n;
}

/** See the definitions in ./types.ts. */
export function extractRotationFeatures(
  challenge: RotationChallenge,
  session: InteractionSession,
  context: RotationFeatureContext,
): FeatureSet<RotationFeatures> {
  const a = deriveRotation(challenge, context, session);
  const released = a.drags.filter((d) => d.released);
  const first = session.events.find(
    (e) =>
      e.target === ROTATION_TARGET &&
      ((isPointerEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && keyTurn(e.code) !== 0)),
  );
  const ends = [...released.map((d) => d.endT), ...a.keyEventTimes];
  const pointerSteps = released.flatMap((d) => d.steps);
  const pointerTotal = pointerSteps.reduce((s, x) => s + Math.abs(x.delta), 0);
  const pointerTime = released.reduce((s, d) => s + (d.endT - d.startT), 0);
  const speeds = pointerSteps.filter((s) => s.dt > 0).map((s) => (Math.abs(s.delta) / s.dt) * 1000);

  return createFeatureSet(composeVersion(ROTATION_FEATURES_SCHEMA), composeVersion(ROTATION_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: first ? first.t : null,
    rotationDuration: first && ends.length > 0 ? Math.max(0, Math.max(...ends) - first.t) : null,
    angularDistance: pointerTotal + a.keySteps.reduce((s, x) => s + Math.abs(x.delta), 0),
    meanAngularVelocity: pointerTime > 0 ? (pointerTotal / pointerTime) * 1000 : null,
    maxAngularVelocity: speeds.length > 0 ? Math.max(...speeds) : null,
    angularCorrections: released.reduce((s, d) => s + reversals(d.steps), 0) + reversals(a.keySteps),
    finalAngularError: shortestAngularDistance(a.finalAngle, challenge.targetAngle),
    attemptCount: a.drags.length + a.keyBursts,
    inputModality: session.inputModality,
  });
}
