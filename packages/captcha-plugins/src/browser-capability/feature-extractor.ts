import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { extractCellActivations } from "../shared/activations";
import { BC_EXTRACTOR, BC_FEATURES_SCHEMA, BC_RUN_TARGET, type BcChallenge, type BcFeatureContext, type BcFeatures } from "./types";

const parseButton = (target: string | undefined): string | null => (target === BC_RUN_TARGET ? target : null);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** See ./types.ts. Counts only: no timing of any kind. */
export function extractBcFeatures(challenge: BcChallenge, session: InteractionSession, context: BcFeatureContext): FeatureSet<BcFeatures> {
  const runs = extractCellActivations(session, parseButton).length;
  return createFeatureSet(composeVersion(BC_FEATURES_SCHEMA), composeVersion(BC_EXTRACTOR), {
    ...extractBaseFeatures(session),
    runCount: runs,
    attemptCount: runs,
    checkCount: challenge.checks.length,
    supportedCount: finite(context.supported) && context.supported <= challenge.checks.length ? context.supported : null,
    inputModality: session.inputModality,
  });
}
