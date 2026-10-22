import type { BaseCaptchaFeatures, InputModality } from "@captchalab/captcha-core";

export const CHECKBOX_ID = "checkbox" as const;

/** Semantic event target. One target on purpose: the control and its label activate the same input. */
export const CHECKBOX_TARGETS = {
  control: "checkbox-control",
} as const;

/** Physical key (KeyboardEvent.code) that activates a native checkbox. Enter does not. */
export const CHECKBOX_ACTIVATION_KEY = "Space" as const;

export interface CheckboxChallenge {
  id: string;
  /** The state the user must leave the checkbox in. */
  expectedChecked: true;
}

/** Final state only. The interaction history lives in the InteractionSession. */
export interface CheckboxAnswer {
  checked: boolean;
}

/**
 * CHECKBOX FEATURE DEFINITIONS (schema checkbox@1). Times are ms on the session clock.
 *
 * Activation-related features (everything except inputModality and the base features) consider only
 * events whose target is CHECKBOX_TARGETS.control.
 *
 * Activation (see activations.ts): one press-and-release of the control.
 *  - pointer: a gesture pointerdown -> pointerup of the same contact (extractGestures) whose pointerup is
 *    on the control. A gesture that ends with pointercancel, is interrupted by a new press, or never ends
 *    is NOT an activation. (A mouse released elsewhere sends no pointerup to the control, so that press stays
 *    open.) Legacy touchstart/touchend count like pointerdown/pointerup.
 *  - keyboard: keydown -> keyup of CHECKBOX_ACTIVATION_KEY on the control. A further keydown while the key
 *    is already down is auto-repeat of the same hold (the first keydown is the press time). A keydown
 *    without its keyup, or a Space event on another target in between, is NOT an activation.
 * Completed activations are ordered by release time (ties: session event order, earlier first).
 * Each completed activation toggles the checkbox, which starts unchecked. So the state after the
 * k-th completed activation is "checked" when k is odd. This is derived from the events alone
 * (activation by assistive technology without pointer/key events is not observable).
 *
 * reactionTime              ms  Time of the first activation-intent event: the first pointerdown (or legacy
 *                               touchstart) on the control or keydown of the activation key on it, even if
 *                               that attempt is later cancelled. Hover and focus are not counted. null if none.
 * timeToFirstActivation     ms  Release time (pointerup / keyup) of the first completed activation. null if none.
 * activationCount               Number of completed activations.
 * successfulActivationIndex     1-based index of the activation that left the checkbox checked at the end
 *                               of the session: the last activation, when activationCount is odd. null when
 *                               the final state is unchecked or there were no activations.
 * pressDuration             ms  release time - press time of that successful activation (pointerup - pointerdown,
 *                               or keyup - keydown). null if there is none. 0 is possible.
 * interActivationTime       ms  Mean gap between the release times of consecutive completed activations.
 *                               null with fewer than 2 activations.
 * inputModality                 The session's modality (core inferModality): "none", "mouse", "touch", "pen",
 *                               "keyboard" or "mixed". Computed over ALL recorded events, including any on
 *                               other targets, unlike the activation features.
 *
 * "Successful" is derived from the events (odd parity) and is NOT the verified answer: a session can
 * pass verification with no observable activation (e.g. assistive technology that sends no pointer or key
 * events) or contain an odd number of activations while the app reports another state. Verification and
 * behavior stay separate.
 *
 * These are descriptive measurements of one interaction, not indicators of human or automated input.
 */
export interface CheckboxFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstActivation: number | null;
  activationCount: number;
  successfulActivationIndex: number | null;
  pressDuration: number | null;
  interActivationTime: number | null;
  inputModality: InputModality;
}

export const CHECKBOX_FEATURES_SCHEMA = "checkbox@1";
export const CHECKBOX_EXTRACTOR = "checkbox@1";
