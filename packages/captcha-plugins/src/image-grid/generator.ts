import type { GenerateContext } from "@captchalab/captcha-core";
import { GRID_SHAPES, GRID_SIZE, type GridCell, type GridShape, type ImageGridChallenge } from "./types";

export const MIN_TARGETS = 2;
export const MAX_TARGETS = 4;

/** Same seed, same grid. 2 to 4 of the 9 cells show the target; the rest show other shapes. */
export function generateImageGridChallenge({ rng }: GenerateContext): ImageGridChallenge {
  const target = GRID_SHAPES[Math.floor(rng() * GRID_SHAPES.length)] as GridShape;
  const others = GRID_SHAPES.filter((s) => s !== target);
  const total = GRID_SIZE * GRID_SIZE;
  const targetCount = MIN_TARGETS + Math.floor(rng() * (MAX_TARGETS - MIN_TARGETS + 1));

  // Choose which cells hold the target (partial Fisher-Yates over the indexes).
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  const targetCells = new Set(order.slice(0, targetCount));

  const cells: GridCell[] = Array.from({ length: total }, (_, i) => ({
    id: `c${i + 1}`,
    shape: targetCells.has(i) ? target : (others[Math.floor(rng() * others.length)] as GridShape),
  }));
  const id = `image-grid-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, target, cells };
}

/** The correct selection for a challenge: every cell that shows the target. */
export function expectedSelection(challenge: ImageGridChallenge): string[] {
  return challenge.cells.filter((c) => c.shape === challenge.target).map((c) => c.id);
}
