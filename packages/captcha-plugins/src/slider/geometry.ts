import type { SliderLayout } from "./types";

/**
 * Single source of truth for slider pixel geometry, shared by the feature extractor and any UI.
 * All values are CSS px in challenge-surface coordinates. See the coordinate model in ./types.ts.
 */

export function isValidSliderLayout(layout: SliderLayout): boolean {
  const { trackLeft, trackWidth, handleWidth } = layout;
  return (
    Number.isFinite(trackLeft) &&
    Number.isFinite(trackWidth) &&
    Number.isFinite(handleWidth) &&
    handleWidth >= 0 &&
    trackWidth - handleWidth > 0
  );
}

/** travel = trackWidth - handleWidth. Throws RangeError for an invalid layout. */
export function sliderTravel(layout: SliderLayout): number {
  if (!isValidSliderLayout(layout)) {
    throw new RangeError("Invalid slider layout: need finite values and trackWidth > handleWidth >= 0.");
  }
  return layout.trackWidth - layout.handleWidth;
}

/** u(x) = clamp(x - trackLeft - handleWidth / 2, 0, travel): handle centered under the pointer. */
export function pointerXToTravelPx(x: number, layout: SliderLayout): number {
  const travel = sliderTravel(layout);
  return Math.min(travel, Math.max(0, x - layout.trackLeft - layout.handleWidth / 2));
}

/** Normalized handle position in [0, 1] for a pointer x. */
export function pointerXToPosition(x: number, layout: SliderLayout): number {
  return pointerXToTravelPx(x, layout) / sliderTravel(layout);
}

/** Px along travel (handleLeft = trackLeft + this) for a normalized position, clamped to [0, 1]. */
export function positionToTravelPx(position: number, layout: SliderLayout): number {
  return Math.min(1, Math.max(0, position)) * sliderTravel(layout);
}
