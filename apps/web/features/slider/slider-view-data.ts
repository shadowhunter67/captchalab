import {
  buildMotionSeries,
  extractGestures,
  gestureTrack,
  pointerTracks,
  type InteractionSession,
  type MotionSeries,
} from "@captchalab/captcha-core";
import {
  SLIDER_TARGETS,
  positionToTravelPx,
  sliderTravel,
  type SliderChallenge,
  type SliderFeatures,
  type SliderLayout,
} from "@captchalab/captcha-plugins";
import { buildTrajectoryGeometry, type Rect, type TrajectoryGeometry } from "@/lib/inspect/trajectory";
import type { NumericMetric } from "@/lib/inspect/metrics";

/**
 * Slider-specific selectors: they decide WHICH data the generic Inspect primitives show.
 *
 *  - Trajectory: every pointer track of the session, hover approach included (hover is real motion
 *    and part of the aggregate motion features). Separate gestures stay separate paths.
 *  - Velocity / acceleration charts: handle drags only. Hover is excluded so the chart answers
 *    "how was the handle dragged"; each drag is its own segment (never joined across attempts).
 */

export interface SliderTrajectoryView {
  geometry: TrajectoryGeometry;
  track: Rect;
  /** Accepted release region as a handle-centre x range, same space as pointer x. */
  targetRegion: Rect;
}

export function buildSliderTrajectory(
  session: InteractionSession,
  layout: SliderLayout,
  challenge: SliderChallenge,
  trackHeight: number,
): SliderTrajectoryView {
  const travel = sliderTravel(layout); // RangeError on an invalid layout; callers pass a validated one
  const track: Rect = { x: layout.trackLeft, y: 0, width: layout.trackWidth, height: trackHeight };
  const centerX = layout.trackLeft + layout.handleWidth / 2 + positionToTravelPx(challenge.target, layout);
  const half = challenge.tolerance * travel;
  return {
    geometry: buildTrajectoryGeometry(pointerTracks(session), [track]),
    track,
    targetRegion: { x: centerX - half, y: 0, width: half * 2, height: trackHeight },
  };
}

function handleDrags(session: InteractionSession) {
  return extractGestures(session).filter((g) => g.target === SLIDER_TARGETS.handle);
}

export function sliderMotionSeries(session: InteractionSession): MotionSeries {
  return buildMotionSeries(handleDrags(session).map((g) => gestureTrack(g.events)));
}

/** Time range covered by handle drags (the charts' x axis), or null when there were none. */
export function sliderDragDomain(session: InteractionSession): [number, number] | null {
  const drags = handleDrags(session);
  if (drags.length === 0) return null;
  return [Math.min(...drags.map((g) => g.startT)), Math.max(...drags.map((g) => g.endT))];
}

/** The Slider's own features, as table rows. The table renders them without knowing the math. */
export function sliderAttemptMetrics(f: SliderFeatures): NumericMetric[] {
  return [
    {
      id: "dragDuration",
      label: "Drag duration",
      value: f.dragDuration,
      unit: "ms",
      description: "Time from pointerdown to pointerup of the final completed handle drag.",
    },
    {
      id: "releaseError",
      label: "Release error",
      value: f.releaseError,
      unit: "px",
      hint: "along handle travel",
      description: "Distance between the release position and the target, in px along the handle's travel.",
    },
    {
      id: "overshoot",
      label: "Overshoot",
      value: f.overshoot,
      unit: "px",
      hint: "past the target",
      description:
        "Farthest the pointer went past the target, in the direction from the starting position toward it.",
    },
    { id: "numberOfAttempts", label: "Number of attempts", value: f.numberOfAttempts, unit: "count" },
  ];
}
