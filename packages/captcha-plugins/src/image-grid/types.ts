import type { ChallengeConfig, BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";
import type { ArtCategory } from "../shared/art";

export const IMAGE_GRID_ID = "image-grid" as const;
export const GRID_SIZE = 3;
export const GRID_SHAPES = ["circle", "square", "triangle", "star", "oval", "rounded"] as const;
export type GridShape = (typeof GRID_SHAPES)[number];

/** Shape sets a variant draws from. "similar" pairs look alike on purpose. */
export const GRID_FAMILIES: Readonly<Record<string, readonly GridShape[]>> = {
  basic: ["circle", "square", "triangle", "star"],
  similar: ["circle", "oval", "square", "rounded"],
};

/** What a cell shows: a plain shape (the shape variants) or an illustrated category (the picture variants, v1.1). */
export type GridSubject = GridShape | ArtCategory;

export interface GridCell {
  id: string;
  /** The subject of the cell: for a picture it is the MAIN object. Legacy name, kept so older challenges still parse. */
  shape: GridSubject;
  /** Seed of the illustration (picture variants). The same seed draws the same picture. */
  art?: number;
  /** Small background objects of a scene tile. They never include the target unless the main object is the target. */
  extras?: readonly ArtCategory[];
}

/** A 3x3 grid of drawn shapes or pictures; the user must select every cell that shows `target`. */
export interface ImageGridChallenge {
  id: string;
  target: GridSubject;
  cells: readonly GridCell[];
  /** How it was generated (variant, difficulty, parameters). Absent on hand-built challenges. */
  config?: ChallengeConfig;
}

/** Final selection only: cell ids. */
export interface ImageGridAnswer {
  selected: string[];
}

/** Semantic target of an event on a cell. The cell id is part of it: "grid-cell:<cellId>". */
export const GRID_CELL_PREFIX = "grid-cell:" as const;
export const makeCellTarget = (cellId: string): string => `${GRID_CELL_PREFIX}${cellId}`;
export function parseCellTarget(target: string | undefined): string | null {
  if (target === undefined || !target.startsWith(GRID_CELL_PREFIX)) return null;
  const id = target.slice(GRID_CELL_PREFIX.length);
  return /^[a-z0-9-]{1,16}$/.test(id) ? id : null;
}

/**
 * IMAGE GRID FEATURE DEFINITIONS (schema image-grid@1). Times ms on the session clock.
 *
 * Toggle: one activation of a cell. Pointer: a pointerdown followed by a pointerup on the same cell (same
 * contact). Keyboard: a keydown of Space or Enter on the cell. Each toggle flips that cell's selection (all
 * cells start unselected), so a cell's state after its k-th toggle is "selected" when k is odd. Other targets
 * and incomplete presses are ignored.
 *
 * reactionTime           ms  First press on a cell (pointerdown or Space/Enter keydown), even if it never completes.
 * timeToFirstSelection   ms  Time of the first toggle that selected a cell. null if none.
 * completionTime             (base) the whole session, ms.
 * selectionCount             Cells selected at the end (odd number of toggles).
 * correctionCount            Toggles that deselected a cell (an even-numbered toggle of that cell).
 * interClickTimeMean     ms  Mean gap between consecutive toggles (any cell). null with fewer than 2 toggles.
 * attemptCount               Toggles divided into rounds: a new round starts after a pause of more than
 *                            IMAGE_GRID_ATTEMPT_PAUSE_MS between toggles. 0 with none.
 * inputModality              Session modality (core inferModality).
 *
 * Correctness is never part of these features: whether the selection was right is the verifier's job.
 * Descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface ImageGridFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstSelection: number | null;
  selectionCount: number;
  correctionCount: number;
  interClickTimeMean: number | null;
  attemptCount: number;
  inputModality: InputModality;
}

export const IMAGE_GRID_ATTEMPT_PAUSE_MS = 5000;
export const IMAGE_GRID_FEATURES_SCHEMA = "image-grid@1";
export const IMAGE_GRID_EXTRACTOR = "image-grid@1";
