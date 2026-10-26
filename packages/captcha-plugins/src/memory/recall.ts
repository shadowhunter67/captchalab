import type { MemoryActivation, MemoryChallenge } from "./types";

/** What the page tracks during recall. Sequence: the option ids chosen so far, in order. Position: the chosen cell ids. */
export interface RecallState {
  selected: readonly string[];
}

export const EMPTY_RECALL: RecallState = { selected: [] };

export type RecallEffect = "select" | "deselect" | "undo" | "clear" | "none";

export interface RecallStep {
  state: RecallState;
  effect: RecallEffect;
  /** For "select": whether it was right when made. */
  correct: boolean;
}

/**
 * The one set of recall rules, shared by the page and the feature extractor.
 *
 * Sequence: choosing an option appends it (each option once; no more than the sequence length). It is correct when it
 * is the next item of the sequence. Undo removes the last choice; Clear removes all of them.
 * Position: choosing a cell selects it (correct when it is a target); choosing it again deselects it. Undo and Clear
 * are not used.
 * Start and anything that does not apply change nothing.
 */
export function applyRecall(state: RecallState, act: MemoryActivation, challenge: MemoryChallenge): RecallStep {
  const none: RecallStep = { state, effect: "none", correct: false };
  if (challenge.kind === "sequence") {
    if (act.kind === "option") {
      const known = challenge.options.some((o) => o.id === act.id);
      if (!known || state.selected.includes(act.id) || state.selected.length >= challenge.sequence.length) return none;
      return { state: { selected: [...state.selected, act.id] }, effect: "select", correct: challenge.sequence[state.selected.length] === act.id };
    }
    if (act.kind === "undo") return state.selected.length === 0 ? none : { ...none, state: { selected: state.selected.slice(0, -1) }, effect: "undo" };
    if (act.kind === "clear") return state.selected.length === 0 ? none : { ...none, state: EMPTY_RECALL, effect: "clear" };
    return none;
  }
  if (act.kind !== "cell") return none;
  const valid = /^c\d{1,2}$/.test(act.id) && Number(act.id.slice(1)) >= 1 && Number(act.id.slice(1)) <= challenge.size * challenge.size;
  if (!valid) return none;
  if (state.selected.includes(act.id)) return { ...none, state: { selected: state.selected.filter((s) => s !== act.id) }, effect: "deselect" };
  return { state: { selected: [...state.selected, act.id] }, effect: "select", correct: challenge.targets.includes(act.id) };
}

/** The answer for the current state. */
export function memoryAnswer(challenge: MemoryChallenge, state: RecallState): { kind: "sequence"; selections: string[] } | { kind: "position"; selectedCells: string[] } {
  return challenge.kind === "sequence" ? { kind: "sequence", selections: [...state.selected] } : { kind: "position", selectedCells: [...state.selected] };
}
