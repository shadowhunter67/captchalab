import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { GRID_SHAPES, type GridShape } from "../image-grid/types";
import type { MemoryChallenge, MemoryOption } from "./types";
import { MEMORY_VARIANTS } from "./variants";

function shuffled<T>(values: readonly T[], rng: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Same seed + variant + difficulty, same items or cells and the same preview time. */
export function generateMemoryChallenge({ rng, variantId, difficulty }: GenerateContext): MemoryChallenge {
  const { variant, config, challengeConfig } = resolveVariant(MEMORY_VARIANTS, { variantId, difficulty });
  assertRange("memory preview", config.previewMs, 1000, 8000);
  const body = Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0");

  if (variant.id === "position") {
    assertRange("memory grid size", config.gridSize, 2, 5);
    const total = config.gridSize * config.gridSize;
    assertRange("memory cells", config.cells, 1, total - 1);
    const all = Array.from({ length: total }, (_, i) => `c${i + 1}`);
    const targets = shuffled(all, rng).slice(0, config.cells).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    return { id: `memory-${body}`, kind: "position", size: config.gridSize, targets, previewMs: config.previewMs, config: challengeConfig };
  }

  assertRange("memory items", config.items, 2, GRID_SHAPES.length);
  assertRange("memory options", config.options, config.items, GRID_SHAPES.length);
  const shapes = shuffled<GridShape>(GRID_SHAPES, rng);
  const shown = shapes.slice(0, config.items);
  const optionShapes = shuffled(shapes.slice(0, config.options), rng);
  const options: MemoryOption[] = optionShapes.map((shape, i) => ({ id: `o${i + 1}`, shape }));
  const idOf = (shape: GridShape): string => (options.find((o) => o.shape === shape) as MemoryOption).id;
  return { id: `memory-${body}`, kind: "sequence", options, sequence: shown.map(idOf), previewMs: config.previewMs, config: challengeConfig };
}
