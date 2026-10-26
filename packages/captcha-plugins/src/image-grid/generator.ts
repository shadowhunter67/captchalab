import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { GRID_FAMILIES, GRID_SIZE, type GridCell, type GridShape, type ImageGridChallenge } from "./types";
import { IMAGE_GRID_VARIANTS } from "./variants";

export const MIN_TARGETS = 2;
export const MAX_TARGETS = 5;

/** Same seed + variant + difficulty, same grid. targetMin..targetMax of the 9 cells show the target. */
export function generateImageGridChallenge({ rng, variantId, difficulty }: GenerateContext): ImageGridChallenge {
  const { config, challengeConfig } = resolveVariant(IMAGE_GRID_VARIANTS, { variantId, difficulty });
  const total = GRID_SIZE * GRID_SIZE;
  assertRange("image grid minimum targets", config.targetMin, 1, total - 1);
  assertRange("image grid maximum targets", config.targetMax, config.targetMin, total - 1);
  const shapes: readonly GridShape[] | undefined = GRID_FAMILIES[config.family];
  if (!shapes) throw new RangeError(`Unknown shape family "${config.family}"`);

  const target = shapes[Math.floor(rng() * shapes.length)] as GridShape;
  const others = shapes.filter((s) => s !== target);
  const targetCount = config.targetMin + Math.floor(rng() * (config.targetMax - config.targetMin + 1));

  // Choose which cells hold the target (Fisher-Yates over the indexes).
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
  return { id, target, cells, config: challengeConfig };
}

/** The correct selection for a challenge: every cell that shows the target. */
export function expectedSelection(challenge: ImageGridChallenge): string[] {
  return challenge.cells.filter((c) => c.shape === challenge.target).map((c) => c.id);
}
