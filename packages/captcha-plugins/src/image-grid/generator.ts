import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { ART_CATEGORIES, artGroupOf, type ArtCategory } from "../shared/art";
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
  if (config.family === "photos" || config.family === "scenes") {
    return generatePictureGrid(rng, config.family, config.lookalike, config.targetMin, config.targetMax, challengeConfig);
  }
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

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * The picture variants. For every cell the MAIN object is either the target (a positive) or another category (a negative).
 * A scene tile also has up to two small background objects; they are never the target, so a negative tile never shows the
 * target anywhere and a positive tile shows it as its main object: there is exactly one right answer. The look-alike level
 * decides how many negatives come from the target's own group (vehicles, animals...).
 */
function generatePictureGrid(rng: () => number, family: string, lookalike: string, targetMin: number, targetMax: number, challengeConfig: NonNullable<ImageGridChallenge["config"]>): ImageGridChallenge {
  const total = GRID_SIZE * GRID_SIZE;
  const target = ART_CATEGORIES[Math.floor(rng() * ART_CATEGORIES.length)] as ArtCategory;
  const group = artGroupOf(target).filter((c) => c !== target);
  const outside = ART_CATEGORIES.filter((c) => c !== target && !group.includes(c));
  const targetCount = targetMin + Math.floor(rng() * (targetMax - targetMin + 1));
  const positives = new Set(shuffle(Array.from({ length: total }, (_, i) => i), rng).slice(0, targetCount));
  const negatives = total - targetCount;
  // How many negatives are look-alikes (from the target's group).
  const near = group.length === 0 ? 0 : lookalike === "group" ? Math.ceil(negatives * 0.7) : lookalike === "some" ? Math.ceil(negatives / 3) : 0;
  const pickNegative = (k: number): ArtCategory => {
    const pool = k < near ? group : outside;
    return pool[Math.floor(rng() * pool.length)] as ArtCategory;
  };
  const others = ART_CATEGORIES.filter((c) => c !== target);
  let negativeIndex = 0;
  const cells: GridCell[] = Array.from({ length: total }, (_, i) => {
    const positive = positives.has(i);
    const main = positive ? target : pickNegative(negativeIndex++);
    const cell: GridCell = { id: `c${i + 1}`, shape: main, art: Math.floor(rng() * 1_000_000) };
    if (family === "scenes") {
      const count = Math.floor(rng() * 3); // 0..2 small background objects, never the target
      const extras = Array.from({ length: count }, () => others[Math.floor(rng() * others.length)] as ArtCategory);
      return { ...cell, extras };
    }
    return cell;
  });
  // The look-alike slots were used in the order the negatives appear, which is already shuffled by the positives' places.
  const id = `image-grid-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, target, cells, config: challengeConfig };
}

/** The correct selection for a challenge: every cell that shows the target. */
export function expectedSelection(challenge: ImageGridChallenge): string[] {
  return challenge.cells.filter((c) => c.shape === challenge.target).map((c) => c.id);
}
