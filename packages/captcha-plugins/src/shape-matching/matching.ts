import type { Activation, ShapeMatchingChallenge } from "./types";

/** What the page tracks: the selected source (if any) and the current matching. */
export interface MatchState {
  selected: string | null;
  /** source id -> target id */
  matches: Readonly<Record<string, string>>;
}

export const EMPTY_MATCH_STATE: MatchState = { selected: null, matches: {} };

export type MatchEffect = "select" | "deselect" | "match" | "unmatch" | "none";

export interface MatchStep {
  state: MatchState;
  effect: MatchEffect;
  /** For "match": whether an earlier match of that source or that target was replaced. */
  replaced: boolean;
  /** For "match": whether the new pair is the correct one. */
  correct: boolean;
}

/**
 * The one set of interaction rules, shared by the page and the feature extractor.
 *
 *  - Activating a source selects it; activating the selected source again deselects it.
 *  - Activating a target while a source is selected pairs them. The source's earlier match and the target's
 *    earlier source (if any) are dropped, and the selection is cleared.
 *  - Activating a matched target with nothing selected removes that match.
 *  - Anything else, and ids that are not in the challenge, change nothing.
 */
export function applyActivation(state: MatchState, act: Activation, challenge: ShapeMatchingChallenge): MatchStep {
  const none: MatchStep = { state, effect: "none", replaced: false, correct: false };
  if (act.kind === "source") {
    if (!challenge.sources.some((s) => s.id === act.id)) return none;
    return state.selected === act.id
      ? { ...none, state: { ...state, selected: null }, effect: "deselect" }
      : { ...none, state: { ...state, selected: act.id }, effect: "select" };
  }
  if (!challenge.targets.some((t) => t.id === act.id)) return none;
  if (state.selected !== null) {
    const source = state.selected;
    const next: Record<string, string> = {};
    let replaced = false;
    for (const [s, t] of Object.entries(state.matches)) {
      if (s === source || t === act.id) replaced = true;
      else next[s] = t;
    }
    next[source] = act.id;
    return { state: { selected: null, matches: next }, effect: "match", replaced, correct: challenge.matches[source] === act.id };
  }
  const owner = Object.entries(state.matches).find(([, t]) => t === act.id)?.[0];
  if (owner === undefined) return none;
  const rest = Object.fromEntries(Object.entries(state.matches).filter(([s]) => s !== owner));
  return { ...none, state: { selected: null, matches: rest }, effect: "unmatch" };
}

/** The answer for the current state: every source mapped to its target, or null. */
export function answerFromState(challenge: ShapeMatchingChallenge, state: MatchState): Record<string, string | null> {
  return Object.fromEntries(challenge.sources.map((s) => [s.id, state.matches[s.id] ?? null]));
}
