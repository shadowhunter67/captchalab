import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";
import type { Glyph, GlyphAttr } from "../shared/glyph";

export const MATCH_KEY_ID = "match-key" as const;

/**
 * A reference ("key") and several options. `keyAttrs` are the attributes the answer must share with the key:
 * all three for Exact Match, two of them for Attribute Match (the rest, and the size, may differ on purpose).
 * Exactly one option agrees with the key on every key attribute; `correctId` names it.
 */
export interface MatchKeyChallenge {
  id: string;
  reference: Glyph;
  options: readonly Glyph[];
  keyAttrs: readonly GlyphAttr[];
  correctId: string;
  config?: ChallengeConfig;
}

/** The final state only: the option that is selected, or null. */
export interface MatchKeyAnswer {
  selectedId: string | null;
}

/** Semantic target of an option: "mk-option:<id>". */
export const MATCH_OPTION_PREFIX = "mk-option:" as const;
export const makeMatchOptionTarget = (id: string): string => `${MATCH_OPTION_PREFIX}${id}`;
export function parseMatchOptionTarget(target: string | undefined): string | null {
  if (target === undefined || !target.startsWith(MATCH_OPTION_PREFIX)) return null;
  const id = target.slice(MATCH_OPTION_PREFIX.length);
  return /^[a-z0-9-]{1,16}$/.test(id) ? id : null;
}

/**
 * MATCHKEY FEATURE DEFINITIONS (schema match-key@1). Times ms on the session clock.
 *
 * Activation: a completed press on an option, or Space/Enter keydown on it. Activating the selected option clears the
 * selection; activating another option moves the selection to it (see selection.ts, shared with the page).
 *
 * reactionTime            ms  First press on an option (even if it never completes). null if none.
 * timeToFirstSelection    ms  Time of the first activation. null if none.
 * completionTime              (base) the whole session, ms.
 * selectionCount              Activations that selected an option.
 * wrongSelectionCount         Selections of an option that is not the correct one.
 * correctionCount             Selections that replaced another selection, plus selections that were cleared.
 * inputModality               Session modality (core inferModality).
 *
 * Correctness of the final answer is the verifier's job and never part of these features. Descriptive measurements
 * of one interaction, not indicators of human or automated input.
 */
export interface MatchKeyFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstSelection: number | null;
  selectionCount: number;
  wrongSelectionCount: number;
  correctionCount: number;
  inputModality: InputModality;
}

export const MATCH_KEY_FEATURES_SCHEMA = "match-key@1";
export const MATCH_KEY_EXTRACTOR = "match-key@1";
