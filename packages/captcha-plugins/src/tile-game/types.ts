import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";
import type { Glyph, GlyphAttr } from "../shared/glyph";

export const TILE_GAME_ID = "tile-game" as const;

export type TileKind = "pair" | "pattern";

/**
 * Pair Match: exactly one pair of tiles looks identical (shape, pattern and orientation); select both.
 * Pattern Match: a reference tile and a rule attribute; select the `required` tiles that share the reference's value
 * of that attribute. Either way `answerIds` is the one correct set and `required` is its size.
 */
export interface TileGameChallenge {
  id: string;
  kind: TileKind;
  tiles: readonly Glyph[];
  /** Pattern Match only. */
  reference?: Glyph;
  /** Pattern Match only: the attribute the tiles must share with the reference. */
  ruleAttr?: GlyphAttr;
  required: number;
  answerIds: readonly string[];
  config?: ChallengeConfig;
}

/** The final state only: the selected tiles. */
export interface TileGameAnswer {
  selectedIds: readonly string[];
}

/** Semantic target of a tile: "tg-tile:<id>". */
export const TILE_PREFIX = "tg-tile:" as const;
export const makeTileTarget = (id: string): string => `${TILE_PREFIX}${id}`;
export function parseTileTarget(target: string | undefined): string | null {
  if (target === undefined || !target.startsWith(TILE_PREFIX)) return null;
  const id = target.slice(TILE_PREFIX.length);
  return /^[a-z0-9-]{1,16}$/.test(id) ? id : null;
}

/**
 * TILE GAME FEATURE DEFINITIONS (schema tile-game@1). Times ms on the session clock.
 *
 * Activation: a completed press on a tile, or Space/Enter keydown on it. An activation selects an unselected tile,
 * or deselects a selected one; selecting is ignored while `required` tiles are already selected (see selection.ts).
 * An "attempt" is a selection that reaches exactly `required` tiles.
 *
 * reactionTime        ms  First press on a tile (even if it never completes). null if none.
 * firstSelectionTime  ms  Time of the first activation that selected a tile. null if none.
 * completionTime          (base) the whole session, ms.
 * selectionCount          Activations that selected a tile.
 * correctPairCount        Attempts whose selected set equals the answer set.
 * wrongPairCount          Attempts whose selected set does not.
 * correctionCount         Activations that deselected a tile.
 * inputModality           Session modality (core inferModality).
 *
 * "Pair" is the name of the attempt for both variants (in Pattern Match the set may hold more than two tiles).
 * Correctness of the final answer is the verifier's job. Descriptive measurements of one interaction, not
 * indicators of human or automated input.
 */
export interface TileGameFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  firstSelectionTime: number | null;
  selectionCount: number;
  correctPairCount: number;
  wrongPairCount: number;
  correctionCount: number;
  inputModality: InputModality;
}

export const TILE_GAME_FEATURES_SCHEMA = "tile-game@1";
export const TILE_GAME_EXTRACTOR = "tile-game@1";
