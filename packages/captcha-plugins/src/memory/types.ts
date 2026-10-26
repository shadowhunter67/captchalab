import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";
import type { GridShape } from "../image-grid/types";

export const MEMORY_ID = "memory" as const;

export interface MemoryOption {
  id: string;
  shape: GridShape;
}

/**
 * Sequence memory: `sequence` lists the option ids in the order they were shown. The user taps the options in
 * that order. Shapes in a sequence are all different, so every option is chosen at most once.
 */
export interface MemorySequenceChallenge {
  id: string;
  kind: "sequence";
  options: readonly MemoryOption[];
  sequence: readonly string[];
  /** How long the sequence stays visible before it is hidden, ms. */
  previewMs: number;
  config?: ChallengeConfig;
}

/** Position memory: `targets` are the cell ids ("c1".."c<size*size>") that were highlighted; recall them as a set. */
export interface MemoryPositionChallenge {
  id: string;
  kind: "position";
  size: number;
  targets: readonly string[];
  previewMs: number;
  config?: ChallengeConfig;
}

export type MemoryChallenge = MemorySequenceChallenge | MemoryPositionChallenge;

/** Final recall only, no interaction history. */
export type MemoryAnswer = { kind: "sequence"; selections: string[] } | { kind: "position"; selectedCells: string[] };

/** The one thing the page supplies at feature time: when the recall phase began (session clock, ms). */
export interface MemoryFeatureContext {
  recallStartMs: number | null;
}

/** Semantic targets: "mem-option:<id>", "mem-cell:<id>", "mem-undo", "mem-clear", "mem-start". */
export const MEMORY_START_TARGET = "mem-start" as const;
export const MEMORY_UNDO_TARGET = "mem-undo" as const;
export const MEMORY_CLEAR_TARGET = "mem-clear" as const;
export const OPTION_TARGET_PREFIX = "mem-option:" as const;
export const CELL_TARGET_PREFIX = "mem-cell:" as const;
export const makeMemoryOptionTarget = (id: string): string => `${OPTION_TARGET_PREFIX}${id}`;
export const makeMemoryCellTarget = (id: string): string => `${CELL_TARGET_PREFIX}${id}`;

export type MemoryActivation =
  | { kind: "start" }
  | { kind: "option"; id: string }
  | { kind: "cell"; id: string }
  | { kind: "undo" }
  | { kind: "clear" };

const ID = /^[a-z0-9-]{1,16}$/;
export function parseMemoryTarget(target: string | undefined): MemoryActivation | null {
  if (target === undefined) return null;
  if (target === MEMORY_START_TARGET) return { kind: "start" };
  if (target === MEMORY_UNDO_TARGET) return { kind: "undo" };
  if (target === MEMORY_CLEAR_TARGET) return { kind: "clear" };
  for (const [prefix, kind] of [[OPTION_TARGET_PREFIX, "option"], [CELL_TARGET_PREFIX, "cell"]] as const) {
    if (target.startsWith(prefix)) {
      const id = target.slice(prefix.length);
      return ID.test(id) ? { kind, id } : null;
    }
  }
  return null;
}

/**
 * MEMORY FEATURE DEFINITIONS (schema memory@1). Times ms. The challenge has two phases: a preview (shown, then
 * hidden) and a recall. The page tells the extractor when recall began (MemoryFeatureContext.recallStartMs).
 *
 * Activation: a completed press on a control (pointerdown then pointerup on the same control) or a Space/Enter
 * keydown on it. Activations are replayed through the rules in recall.ts.
 *
 * reactionTime          First press on any memory control (including Start), session clock. null if none.
 * recallDuration        From the start of recall to the last recall action (selection, undo, clear). null if none.
 * timeToFirstSelection  From the start of recall to the first selection. null if none or recall never began.
 * completionTime        (base) the whole session.
 * selectionCount        Selections made (each one counts, even if later undone).
 * correctSelections     Selections that were right when made (the right next item, or a target cell).
 * incorrectSelections   Selections that were not.
 * correctionCount       Undo and clear presses, plus deselecting a cell.
 * inputModality         Session modality.
 *
 * What was to be remembered (item count, grid size, preview time) is challenge configuration, not a feature.
 * Descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface MemoryFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  recallDuration: number | null;
  timeToFirstSelection: number | null;
  selectionCount: number;
  correctSelections: number;
  incorrectSelections: number;
  correctionCount: number;
  inputModality: InputModality;
}

export const MEMORY_FEATURES_SCHEMA = "memory@1";
export const MEMORY_EXTRACTOR = "memory@1";
