import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";
import type { GridShape } from "../image-grid/types";

export const SHAPE_MATCHING_ID = "shape-matching" as const;

/** One drawn shape. `shape` is its structural identity; rotation, fill and scale are only presentation. */
export interface MatchShape {
  id: string;
  shape: GridShape;
  /** Degrees, clockwise. */
  rotation: number;
  filled: boolean;
  /** Relative size, around 1. */
  scale: number;
}

/**
 * Every source belongs to exactly one target (the target with the same structural shape), so there is exactly one
 * correct matching. `matches` maps each source id to its target id.
 */
export interface ShapeMatchingChallenge {
  id: string;
  sources: readonly MatchShape[];
  targets: readonly MatchShape[];
  matches: Readonly<Record<string, string>>;
  config?: ChallengeConfig;
}

/** The final matching only: source id -> target id, or null when the source has no target. */
export interface ShapeMatchingAnswer {
  matches: Record<string, string | null>;
}

/** Semantic targets of events on the cells: "sm-source:<id>" and "sm-target:<id>". */
export const SOURCE_PREFIX = "sm-source:" as const;
export const TARGET_PREFIX = "sm-target:" as const;
export const makeSourceTarget = (id: string): string => `${SOURCE_PREFIX}${id}`;
export const makeTargetTarget = (id: string): string => `${TARGET_PREFIX}${id}`;

export interface Activation {
  kind: "source" | "target";
  id: string;
}

export function parseMatchTarget(target: string | undefined): Activation | null {
  if (target === undefined) return null;
  const kind = target.startsWith(SOURCE_PREFIX) ? "source" : target.startsWith(TARGET_PREFIX) ? "target" : null;
  if (kind === null) return null;
  const id = target.slice(kind === "source" ? SOURCE_PREFIX.length : TARGET_PREFIX.length);
  return /^[a-z0-9-]{1,16}$/.test(id) ? { kind, id } : null;
}

/**
 * SHAPE MATCHING FEATURE DEFINITIONS (schema shape-matching@1). Times ms on the session clock.
 *
 * Activation: a completed press on a source or target (pointerdown then pointerup on the same cell) or a Space/Enter
 * keydown on it. Activations are replayed through the same rules the page uses (see matching.ts): selecting a source,
 * then a target, makes a match; a later match for the same source or the same target replaces the earlier one;
 * activating a matched target with nothing selected removes its match.
 *
 * reactionTime         ms  First press on a cell (even if it never completes). null if none.
 * timeToFirstMatch     ms  Time of the first activation that made a match. null if none.
 * completionTime           (base) the whole session, ms.
 * selectionCount           Activations that selected a source.
 * matchAttempts            Activations that made a match.
 * correctMatchCount        Match attempts that paired a source with its own target.
 * incorrectMatchCount      Match attempts that paired it with another target.
 * correctionCount          Matches replaced by a later one, plus matches removed.
 * interActionTimeMean  ms  Mean gap between consecutive activations. null with fewer than 2.
 * inputModality            Session modality (core inferModality).
 *
 * Correctness of the final matching is the verifier's job and is never part of these features. Descriptive
 * measurements of one interaction, not indicators of human or automated input.
 */
export interface ShapeMatchingFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstMatch: number | null;
  selectionCount: number;
  matchAttempts: number;
  correctMatchCount: number;
  incorrectMatchCount: number;
  correctionCount: number;
  interActionTimeMean: number | null;
  inputModality: InputModality;
}

export const SHAPE_MATCHING_FEATURES_SCHEMA = "shape-matching@1";
export const SHAPE_MATCHING_EXTRACTOR = "shape-matching@1";
