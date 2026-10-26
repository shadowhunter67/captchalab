import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { DRAG_DROP_VARIANTS } from "./variants";
import type { DragDropChallenge, DragDropItem, DragDropTarget, ShapeKind } from "./types";

export const DRAG_DROP_ITEM_SIZE = 0.17;
export const DRAG_DROP_TOLERANCE = 0.14;

const KINDS: readonly ShapeKind[] = ["circle", "square", "triangle"];
/** Column centers shared by the target row and the item row. */
const COLUMNS = [0.2, 0.5, 0.8] as const;
const TARGET_Y = 0.2;
const ITEM_Y = 0.78;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Fisher-Yates over a copy, using the seeded rng only. */
function shuffled<T>(values: readonly T[], rng: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Three shapes and three drop areas in two rows (targets on top, items at the bottom). Which shape
 * belongs to which column, and the item order, come from the seeded rng; small jitter keeps item starts
 * from looking aligned. Rows are 0.58 of the surface height apart and columns 0.3 of its width, so for a
 * surface at least as wide as tall (the UI guarantees it) items and targets never overlap and no item
 * starts on a target. Same seed, same challenge. No clock, no Math.random.
 */
export function generateDragDropChallenge({ rng, variantId, difficulty }: GenerateContext): DragDropChallenge {
  const { config, challengeConfig } = resolveVariant(DRAG_DROP_VARIANTS, { variantId, difficulty });
  assertRange("drag-drop item size", config.itemSize, 0.1, 0.25);
  assertRange("drag-drop drop tolerance", config.dropTolerance, 0.06, 0.25);
  const targetKinds = shuffled(KINDS, rng);
  const itemColumns = shuffled([0, 1, 2], rng);

  const targets: DragDropTarget[] = targetKinds.map((kind, i) => ({
    id: `target-${kind}`,
    acceptsItemId: `item-${kind}`,
    position: { x: COLUMNS[i] as number, y: TARGET_Y },
  }));
  const items: DragDropItem[] = shuffled(KINDS, rng).map((kind, i) => ({
    id: `item-${kind}`,
    kind,
    start: {
      x: round4((COLUMNS[itemColumns[i] as number] as number) + (rng() - 0.5) * 0.06),
      y: round4(ITEM_Y + (rng() - 0.5) * 0.08),
    },
  }));

  const id = `drag-drop-${Math.floor(rng() * 0x100000000)
    .toString(16)
    .padStart(8, "0")}`;
  return { id, items, targets, itemSize: config.itemSize, dropTolerance: config.dropTolerance, config: challengeConfig };
}
