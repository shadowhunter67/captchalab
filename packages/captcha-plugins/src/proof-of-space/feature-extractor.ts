import { composeVersion, createFeatureSet, extractBaseFeatures, type FeatureSet, type InteractionSession } from "@captchalab/captcha-core";
import { extractCellActivations, firstCellPress } from "../shared/activations";
import { POS_CANCEL_TARGET, POS_EXTRACTOR, POS_FEATURES_SCHEMA, POS_START_TARGET, type PosChallenge, type PosFeatureContext, type PosFeatures } from "./types";

const parseButton = (target: string | undefined): string | null => (target === POS_START_TARGET || target === POS_CANCEL_TARGET ? target : null);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** See the definitions in ./types.ts. The measured run comes from the page; correctness is the verifier's job. */
export function extractPosFeatures(_challenge: PosChallenge, session: InteractionSession, context: PosFeatureContext): FeatureSet<PosFeatures> {
  const acts = extractCellActivations(session, parseButton);
  const starts = acts.filter((a) => a.id === POS_START_TARGET).length;
  const cancels = acts.filter((a) => a.id === POS_CANCEL_TARGET).length;
  const run = context.run;
  const ok = run !== null && finite(run.allocatedBytes) && finite(run.fillMs) && finite(run.proofMs) && finite(run.operations);
  const verification = finite(context.verificationMs) ? context.verificationMs : null;
  return createFeatureSet(composeVersion(POS_FEATURES_SCHEMA), composeVersion(POS_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstCellPress(session, parseButton),
    startCount: starts,
    cancelCount: cancels,
    attemptCount: starts,
    allocatedBytes: ok ? run.allocatedBytes : null,
    fillTime: ok ? run.fillMs : null,
    verificationTime: verification,
    totalTime: ok && verification !== null ? run.fillMs + run.proofMs + verification : null,
    operations: ok ? run.operations : null,
    inputModality: session.inputModality,
  });
}
