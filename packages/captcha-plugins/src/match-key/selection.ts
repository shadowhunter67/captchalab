export interface SelectionStep {
  selected: string | null;
  effect: "select" | "replace" | "clear";
}

/** One activation of an option: the same rule for the page and for the feature extractor. */
export function applyOptionActivation(selected: string | null, id: string): SelectionStep {
  if (selected === id) return { selected: null, effect: "clear" };
  return { selected: id, effect: selected === null ? "select" : "replace" };
}
