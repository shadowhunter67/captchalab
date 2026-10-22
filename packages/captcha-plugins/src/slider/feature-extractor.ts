import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  extractMotionFeatures,
  MOTION_EXTRACTOR,
  MOTION_FEATURES_SCHEMA,
  type FeatureSet,
  type InteractionSession,
  type PointerGesture,
} from "@captchalab/captcha-core";
import {
  SLIDER_EXTRACTOR,
  SLIDER_FEATURES_SCHEMA,
  SLIDER_TARGETS,
  type SliderChallenge,
  type SliderFeatureContext,
  type SliderFeatures,
  type SliderLayout,
} from "./types";

/** See the definitions in ./types.ts. */
export function selectFinalSliderAttempt(gestures: readonly PointerGesture[]): PointerGesture | null {
  let best: PointerGesture | null = null;
  for (const g of gestures) {
    if (g.target !== SLIDER_TARGETS.handle || g.endedBy !== "up") continue;
    if (!best || g.endT > best.endT || (g.endT === best.endT && g.endIndex > best.endIndex)) best = g;
  }
  return best;
}

function travelOf(layout: SliderLayout): number {
  const { trackLeft, trackWidth, handleWidth } = layout;
  const travel = trackWidth - handleWidth;
  if (![trackLeft, trackWidth, handleWidth].every(Number.isFinite) || handleWidth < 0 || travel <= 0) {
    throw new RangeError("Invalid slider layout: need finite values and trackWidth > handleWidth >= 0.");
  }
  return travel;
}

export function extractSliderFeatures(
  challenge: SliderChallenge,
  session: InteractionSession,
  { layout }: SliderFeatureContext,
): FeatureSet<SliderFeatures> {
  const travel = travelOf(layout);
  const toTravelPx = (x: number): number =>
    Math.min(travel, Math.max(0, x - layout.trackLeft - layout.handleWidth / 2));
  const targetPx = challenge.target * travel;

  const gestures = extractGestures(session);
  const numberOfAttempts = gestures.filter((g) => g.target === SLIDER_TARGETS.handle).length;
  const attempt = selectFinalSliderAttempt(gestures);

  let dragDuration: number | null = null;
  let releaseError: number | null = null;
  let overshoot: number | null = null;
  if (attempt) {
    const first = attempt.events[0];
    const last = attempt.events[attempt.events.length - 1];
    if (first && last) {
      dragDuration = attempt.endT - attempt.startT;
      releaseError = Math.abs(toTravelPx(last.x) - targetPx);
      const start = toTravelPx(first.x);
      const dir = Math.sign(targetPx - start);
      let past = 0;
      if (dir !== 0) {
        for (const e of attempt.events) past = Math.max(past, dir * (toTravelPx(e.x) - targetPx));
      }
      overshoot = past;
    }
  }

  return createFeatureSet(
    composeVersion(SLIDER_FEATURES_SCHEMA, MOTION_FEATURES_SCHEMA),
    composeVersion(SLIDER_EXTRACTOR, MOTION_EXTRACTOR),
    {
      ...extractBaseFeatures(session),
      ...extractMotionFeatures(session),
      numberOfAttempts,
      dragDuration,
      releaseError,
      overshoot,
    },
  );
}
