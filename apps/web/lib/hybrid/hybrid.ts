/**
 * Hybrid challenges are COMPOSED, not a new plugin: a Proof of Work stage followed by a Slider or Audio stage, each
 * verified by its own plugin. This module is the one rule that joins them. It reads outcomes only; it never looks at
 * metrics, so computation numbers (hashes) can never leak into a pass/fail or into the interaction signals.
 */

export type HybridKind = "pow-visual" | "pow-audio";
export const HYBRID_KINDS: readonly HybridKind[] = ["pow-visual", "pow-audio"];
export const isHybridKind = (v: string | null | undefined): v is HybridKind => v === "pow-visual" || v === "pow-audio";

/** What one stage reported: which challenge it was about, and whether that plugin's verifier passed it. */
export interface StageOutcome {
  challengeId: string;
  passed: boolean;
}

export interface HybridStages {
  pow: StageOutcome | null;
  child: StageOutcome | null;
}

/** The two challenges currently on screen. An outcome about any other challenge is stale and counts for nothing. */
export interface HybridExpected {
  powId: string;
  childId: string;
}

export type HybridReason = "passed" | "pow-missing" | "pow-failed" | "child-missing" | "child-failed";

export interface HybridVerdict {
  passed: boolean;
  reason: HybridReason;
  /** Per stage: "passed", "failed", or "pending" (nothing valid for the current challenge). */
  pow: "passed" | "failed" | "pending";
  child: "passed" | "failed" | "pending";
}

const read = (o: StageOutcome | null, id: string): "passed" | "failed" | "pending" => (o === null || o.challengeId !== id ? "pending" : o.passed ? "passed" : "failed");

/** The second stage opens only once the first is valid for the current challenge. */
export function childUnlocked(expected: HybridExpected, stages: HybridStages): boolean {
  return read(stages.pow, expected.powId) === "passed";
}

/** Passed only when BOTH stages passed for the CURRENT challenges. */
export function hybridVerdict(expected: HybridExpected, stages: HybridStages): HybridVerdict {
  const pow = read(stages.pow, expected.powId);
  // A child outcome counts only after the first stage is valid: it cannot be reached (or kept) otherwise.
  const child = pow === "passed" ? read(stages.child, expected.childId) : "pending";
  const reason: HybridReason =
    pow === "pending" ? "pow-missing" : pow === "failed" ? "pow-failed" : child === "pending" ? "child-missing" : child === "failed" ? "child-failed" : "passed";
  return { passed: reason === "passed", reason, pow, child };
}

/** Records an outcome; a later one for the same stage replaces the earlier one. */
export const withOutcome = (stages: HybridStages, stage: "pow" | "child", outcome: StageOutcome | null): HybridStages => ({ ...stages, [stage]: outcome });
