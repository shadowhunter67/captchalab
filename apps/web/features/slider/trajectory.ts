import {
  isPointerEvent,
  pointerTracks,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  positionToTravelPx,
  sliderTravel,
  type SliderChallenge,
  type SliderLayout,
} from "@captchalab/captcha-plugins";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Trajectory {
  /** SVG viewBox in surface coordinates (track plus all samples, padded). */
  viewBox: Rect;
  track: Rect;
  /** Accepted release region, as handle-center x range (same space as pointer x). */
  targetRegion: Rect;
  /** One SVG path per movement track; separate gestures are never joined. */
  paths: string[];
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** Time of the first/last pointer sample (ms since session start); null without pointer data. */
  span: { startT: number; endT: number } | null;
}

const PAD = 12;

/**
 * Pure transform InteractionSession -> drawable geometry. Reads only normalized session data and
 * the layout/challenge; never the DOM, and never mutates the session.
 */
export function buildTrajectory(
  session: InteractionSession,
  layout: SliderLayout,
  challenge: SliderChallenge,
  trackHeight: number,
): Trajectory {
  const travel = sliderTravel(layout); // RangeError on invalid layout; callers pass a validated one
  const track: Rect = { x: layout.trackLeft, y: 0, width: layout.trackWidth, height: trackHeight };
  const centerX = layout.trackLeft + layout.handleWidth / 2 + positionToTravelPx(challenge.target, layout);
  const half = challenge.tolerance * travel;
  const targetRegion: Rect = { x: centerX - half, y: 0, width: half * 2, height: trackHeight };

  const tracks = pointerTracks(session);
  const paths = tracks.map((pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "));

  let minX = track.x;
  let maxX = track.x + track.width;
  let minY = 0;
  let maxY = trackHeight;
  let startT = Number.POSITIVE_INFINITY;
  let endT = Number.NEGATIVE_INFINITY;
  let start: Trajectory["start"] = null;
  let end: Trajectory["end"] = null;
  for (const e of session.events) {
    if (!isPointerEvent(e) || e.type === "click") continue;
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x);
    minY = Math.min(minY, e.y);
    maxY = Math.max(maxY, e.y);
    if (e.t < startT) {
      startT = e.t;
      start = { x: e.x, y: e.y };
    }
    if (e.t >= endT) {
      endT = e.t;
      end = { x: e.x, y: e.y };
    }
  }

  return {
    viewBox: { x: minX - PAD, y: minY - PAD, width: maxX - minX + 2 * PAD, height: maxY - minY + 2 * PAD },
    track,
    targetRegion,
    paths,
    start,
    end,
    span: start && end ? { startT, endT } : null,
  };
}
