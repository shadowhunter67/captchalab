import type { BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";

export const IMAGE_GRID_ID = "image-grid" as const;
export const GRID_SIZE = 3;
export const GRID_SHAPES = ["circle", "square", "triangle", "star"] as const;
export type GridShape = (typeof GRID_SHAPES)[number];

export interface GridCell {
  id: string;
  shape: GridShape;
}

/** A 3x3 grid of drawn shapes; the user must select every cell that shows `target`. */
export interface ImageGridChallenge {
  id: string;
  target: GridShape;
  cells: readonly GridCell[];
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
