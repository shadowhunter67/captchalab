import { classify, type Classification, type ClassificationLabel } from "@/lib/behavior/classifier";
import {
  INVISIBLE_PROFILES,
  analyzeInvisibleSession,
  escalationFor,
  generateSyntheticInvisibleSession,
  type Escalation,
  type InvisibleProfile,
} from "@/lib/behavior/invisible";

/**
 * The Adaptive Lab only CONSUMES the existing experimental classifier and the existing simulated escalation
 * (lib/behavior/invisible). It adds no rule, signal or threshold of its own, and decides nothing: a suggestion is
 * text and an optional link, never a block, a redirect or a stored decision.
 */
export const ADAPTIVE_LABELS: readonly ClassificationLabel[] = ["human-like", "uncertain", "synthetic-like"];

/** The full mapping from the classifier's label to the suggested next demo, for display. */
export function adaptiveTable(): readonly { label: ClassificationLabel; escalation: Escalation }[] {
  return ADAPTIVE_LABELS.map((label) => ({ label, escalation: escalationFor(label) }));
}

export interface AdaptiveOutcome {
  profile: InvisibleProfile;
  classification: Classification;
  escalation: Escalation;
}

/** Generated example → existing classifier → existing suggestion. Deterministic for a profile and seed. */
export function adaptiveFor(profile: InvisibleProfile, seed = 1): AdaptiveOutcome {
  const { session } = generateSyntheticInvisibleSession(profile, seed);
  const classification = classify(analyzeInvisibleSession(session));
  return { profile, classification, escalation: escalationFor(classification.label) };
}

export const ADAPTIVE_PROFILES: readonly InvisibleProfile[] = INVISIBLE_PROFILES;
