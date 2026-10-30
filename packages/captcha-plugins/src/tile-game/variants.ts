import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface TileGameVariantConfig {
  [key: string]: number | string | boolean;
  /** Tiles on the board. */
  tiles: number;
  /** Tiles to select (2 for Pair Match). */
  required: number;
  /** "far": wrong tiles are clearly different; "mixed"; "near": wrong tiles differ from the target look in one thing. */
  similarity: string;
}

/** 4 / 6 / 8 tiles. A phone shows 2 or 3 tiles per row, so the board never needs more than four rows. */
export const TILE_GAME_VARIANTS: CaptchaVariantSet<TileGameVariantConfig> = {
  variants: [
    {
      id: "pair",
      name: "Pair Match",
      description: "Exactly two tiles look identical: select both.",
      difficulties: {
        easy: { tiles: 4, required: 2, similarity: "far" },
        medium: { tiles: 6, required: 2, similarity: "mixed" },
        hard: { tiles: 8, required: 2, similarity: "near" },
      },
    },
    {
      id: "pattern",
      name: "Pattern Match",
      description: "Select the tiles that share one named attribute with the reference tile.",
      difficulties: {
        easy: { tiles: 4, required: 2, similarity: "far" },
        medium: { tiles: 6, required: 2, similarity: "mixed" },
        hard: { tiles: 8, required: 3, similarity: "near" },
      },
    },
  ],
  defaultSelection: { variantId: "pair", difficulty: "medium" },
};
