export interface TileStep {
  selected: readonly string[];
  effect: "select" | "deselect" | "ignored";
}

/** One activation of a tile: the same rule for the page and for the feature extractor. */
export function applyTileActivation(selected: readonly string[], id: string, required: number): TileStep {
  if (selected.includes(id)) return { selected: selected.filter((s) => s !== id), effect: "deselect" };
  if (selected.length >= required) return { selected, effect: "ignored" };
  return { selected: [...selected, id], effect: "select" };
}

/** True when both lists hold the same ids (order and repeats ignored). */
export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}
