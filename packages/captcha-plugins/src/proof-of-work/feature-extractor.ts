import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { powHash } from "./pow";
import {
  POW_CANCEL_TARGET,
  POW_EXTRACTOR,
  POW_FEATURES_SCHEMA,
  POW_START_TARGET,
  type PowChallenge,
  type PowFeatureContext,
  type PowFeatures,
} from "./types";

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

/** Presses of the Start and Cancel buttons: completed pointer presses and Space/Enter keydowns. */
function presses(session: InteractionSession, target: string): number {
  let n = 0;
  for (const g of extractGestures(session)) {
    const last = g.events[g.events.length - 1];
    if (g.target === target && g.endedBy === "up" && last?.target === target) n++;
  }
  for (const e of session.events) if (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code) && e.target === target) n++;
  return n;
}

/** See the definitions in ./types.ts. The measured run comes from the page; correctness is the verifier's job. */
export function extractPowFeatures(challenge: PowChallenge, session: InteractionSession, context: PowFeatureContext): FeatureSet<PowFeatures> {
  const run = context.run;
  const starts = presses(session, POW_START_TARGET);
  const cancels = presses(session, POW_CANCEL_TARGET);
  const first = session.events.find(
    (e) => (e.target === POW_START_TARGET || e.target === POW_CANCEL_TARGET) && ((!isKeyEvent(e) && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );
  const valid = run !== null && Number.isSafeInteger(run.nonce) && run.nonce >= 0 && Number.isFinite(run.computationMs) && Number.isFinite(run.iterations);
  return createFeatureSet(composeVersion(POW_FEATURES_SCHEMA), composeVersion(POW_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: first?.t ?? null,
    startCount: starts,
    cancelCount: cancels,
    attemptCount: starts,
    computationTime: valid ? run.computationMs : null,
    iterations: valid ? run.iterations : null,
    iterationsPerSecond: valid && run.computationMs > 0 ? run.iterations / (run.computationMs / 1000) : null,
    nonce: valid ? run.nonce : null,
    hashPrefix: valid ? powHash(challenge, run.nonce).slice(0, 12) : null,
    inputModality: session.inputModality,
  });
}
