import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  isKeyEvent,
  isPointerEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { extractCheckboxActivations } from "./activations";
import {
  CHECKBOX_ACTIVATION_KEY,
  CHECKBOX_EXTRACTOR,
  CHECKBOX_FEATURES_SCHEMA,
  CHECKBOX_TARGETS,
  type CheckboxFeatures,
} from "./types";

/** See the definitions in ./types.ts. */
export function extractCheckboxFeatures(session: InteractionSession): FeatureSet<CheckboxFeatures> {
  const intent = session.events.find(
    (e) =>
      e.target === CHECKBOX_TARGETS.control &&
      ((isPointerEvent(e) && (e.type === "pointerdown" || e.type === "touchstart")) ||
        (isKeyEvent(e) && e.type === "keydown" && e.code === CHECKBOX_ACTIVATION_KEY)),
  );

  const completed = extractCheckboxActivations(session).filter((a) => a.completed);
  const count = completed.length;
  const finalChecked = count % 2 === 1; // starts unchecked; each completed activation toggles
  const successful = finalChecked ? completed[count - 1] : undefined;

  let gaps = 0;
  for (let i = 1; i < count; i++) gaps += (completed[i] as { endT: number }).endT - (completed[i - 1] as { endT: number }).endT;

  return createFeatureSet(
    composeVersion(CHECKBOX_FEATURES_SCHEMA),
    composeVersion(CHECKBOX_EXTRACTOR),
    {
      ...extractBaseFeatures(session),
      reactionTime: intent ? intent.t : null,
      timeToFirstActivation: completed[0]?.endT ?? null,
      activationCount: count,
      successfulActivationIndex: successful ? count : null,
      pressDuration: successful ? successful.endT - successful.pressT : null,
      interActivationTime: count >= 2 ? gaps / (count - 1) : null,
      inputModality: session.inputModality,
    },
  );
}
