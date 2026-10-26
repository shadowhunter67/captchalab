import type { NumberRule } from "./types";

/**
 * Uniqueness check used by the generator (and its tests) so that a challenge never has two reasonable answers.
 *
 * "Reasonable" is defined by the pattern families a number sequence can come from, simplest first:
 *   arithmetic   v[k] = v0 + k d
 *   geometric    v[k] = v0 r^k              (r = 2..5)
 *   alternating  steps a, b, a, b, ...      (v0 visible)
 *   interleaved  two arithmetic lanes: even positions start at v0 with step d1, odd positions start at v1 with step d2
 * A challenge made with family F is accepted only if every consistent hypothesis in F or a simpler family predicts
 * the same hidden value. (A more complex family can always be bent to fit anything, so it is not counted.)
 */
const FAMILIES: readonly NumberRule[] = ["arithmetic", "geometric", "alternating", "interleaved"];
const STEP_RANGE = 30;

type Terms = readonly (number | null)[];

const fits = (terms: Terms, build: (k: number) => number): boolean => terms.every((v, k) => v === null || v === build(k));

/** Every hidden value that some consistent hypothesis of `family` predicts. Empty when none is consistent. */
export function predictionsFor(terms: Terms, hiddenIndex: number, family: NumberRule): Set<number> {
  const out = new Set<number>();
  const v0 = terms[0];
  const v1 = terms[1];
  if (typeof v0 !== "number" || typeof v1 !== "number") return out; // the first two terms must be visible
  if (family === "arithmetic") {
    for (let d = -STEP_RANGE; d <= STEP_RANGE; d++) if (fits(terms, (k) => v0 + k * d)) out.add(v0 + hiddenIndex * d);
  } else if (family === "geometric") {
    for (let r = 2; r <= 5; r++) if (fits(terms, (k) => v0 * r ** k)) out.add(v0 * r ** hiddenIndex);
  } else if (family === "alternating") {
    for (let a = -STEP_RANGE; a <= STEP_RANGE; a++) {
      for (let b = -STEP_RANGE; b <= STEP_RANGE; b++) {
        const at = (k: number): number => v0 + Math.ceil(k / 2) * a + Math.floor(k / 2) * b;
        if (fits(terms, at)) out.add(at(hiddenIndex));
      }
    }
  } else {
    for (let d1 = -STEP_RANGE; d1 <= STEP_RANGE; d1++) {
      for (let d2 = -STEP_RANGE; d2 <= STEP_RANGE; d2++) {
        const at = (k: number): number => (k % 2 === 0 ? v0 + (k / 2) * d1 : v1 + ((k - 1) / 2) * d2);
        if (fits(terms, at)) out.add(at(hiddenIndex));
      }
    }
  }
  return out;
}

/** True when the simplest consistent hypotheses (up to `intended`) all give exactly `expected`. */
export function isUnambiguous(terms: Terms, hiddenIndex: number, intended: NumberRule, expected: number): boolean {
  const upTo = FAMILIES.indexOf(intended);
  let found = false;
  for (const family of FAMILIES.slice(0, upTo + 1)) {
    const p = predictionsFor(terms, hiddenIndex, family);
    if (p.size === 0) continue;
    if (p.size !== 1 || !p.has(expected)) return false;
    if (family === intended) found = true;
  }
  return found;
}

/**
 * The same idea for a repeating shape pattern: a hypothesis "the unit has length p" is consistent when every pair of
 * visible symbols p apart is equal, and it predicts the hidden symbol from a visible one p away.
 */
export function visualPredictions(cells: readonly (string | null)[], hiddenIndex: number, period: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + period < cells.length; i++) {
    const a = cells[i];
    const b = cells[i + period];
    if (a != null && b != null && a !== b) return new Set();
  }
  const before = cells[hiddenIndex - period];
  const after = cells[hiddenIndex + period];
  if (hiddenIndex - period >= 0 && before != null) out.add(before);
  if (hiddenIndex + period < cells.length && after != null) out.add(after);
  return out;
}

/** True when every consistent period up to `intended` predicts exactly `expected` (and the intended one can predict). */
export function isVisualUnambiguous(cells: readonly (string | null)[], hiddenIndex: number, intended: number, expected: string): boolean {
  for (let p = 1; p <= intended; p++) {
    const preds = visualPredictions(cells, hiddenIndex, p);
    if (preds.size === 0) {
      if (p === intended) return false; // the intended unit must have a visible anchor for the hidden symbol
      continue;
    }
    if (preds.size !== 1 || !preds.has(expected)) return false;
  }
  return true;
}
