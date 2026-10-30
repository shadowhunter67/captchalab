import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { extractCellActivations, firstCellPress } from "../shared/activations";
import { BC_EXTRACTOR, BC_FEATURES_SCHEMA, BC_RUN_TARGET, type BcChallenge, type BcFeatureContext, type BcFeatures } from "./types";

const parseButton = (target: string | undefined): string | null => (target === BC_RUN_TARGET ? target : null);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** See ./types.ts. Counts and timings only. */
export function extractBcFeatures(challenge: BcChallenge, session: InteractionSession, context: BcFeatureContext): FeatureSet<BcFeatures> {
  const runs = extractCellActivations(session, parseButton).length;
  const run = context.run;
  const ok = run !== null && finite(run.probeMs) && finite(run.computeMs);
  return createFeatureSet(composeVersion(BC_FEATURES_SCHEMA), composeVersion(BC_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstCellPress(session, parseButton),
    runCount: runs,
    attemptCount: runs,
    checkCount: challenge.checks.length,
    supportedCount: ok && finite(context.supported) ? context.supported : null,
    probeTime: ok ? run.probeMs : null,
    computeTime: ok ? run.computeMs : null,
    inputModality: session.inputModality,
  });
}
