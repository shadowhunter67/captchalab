import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface MemoryVariantConfig {
  [key: string]: number;
  /** Sequence: how many items are shown (0 for position memory). */
  items: number;
  /** Sequence: how many answer options are offered, distractors included (0 for position memory). */
  options: number;
  /** Position: the grid is gridSize x gridSize (0 for sequence memory). */
  gridSize: number;
  /** Position: how many cells are highlighted (0 for sequence memory). */
  cells: number;
  /** How long the preview stays visible, ms. */
  previewMs: number;
}

/**
 * Harder levels show more and for less time per item, but the controls stay the same size (the 4x4 grid still has
 * 64 px targets). Preview times are long enough to read; this is a lab, not a speed test.
 */
export const MEMORY_VARIANTS: CaptchaVariantSet<MemoryVariantConfig> = {
  variants: [
    {
      id: "sequence",
      name: "Sequence memory",
      description: "Watch a short sequence of shapes, then tap them again in the same order.",
      difficulties: {
        easy: { items: 3, options: 5, gridSize: 0, cells: 0, previewMs: 4000 },
        medium: { items: 4, options: 6, gridSize: 0, cells: 0, previewMs: 3500 },
        hard: { items: 5, options: 6, gridSize: 0, cells: 0, previewMs: 3000 },
      },
    },
    {
      id: "position",
      name: "Position memory",
      description: "Some cells light up for a moment; recall which ones.",
      difficulties: {
        easy: { items: 0, options: 0, gridSize: 3, cells: 2, previewMs: 3000 },
        medium: { items: 0, options: 0, gridSize: 3, cells: 4, previewMs: 2500 },
        hard: { items: 0, options: 0, gridSize: 4, cells: 6, previewMs: 2500 },
      },
    },
  ],
  defaultSelection: { variantId: "sequence", difficulty: "medium" },
};
