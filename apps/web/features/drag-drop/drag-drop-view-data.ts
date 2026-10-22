import { buildMotionSeries, type InteractionSession, type MotionSeries } from "@captchalab/captcha-core";
import type {
  DragAttempt,
  DragAttemptOutcome,
  DragDropAnalysis,
  DragDropChallenge,
  DragDropFeatures,
  DragDropLayout,
} from "@captchalab/captcha-plugins";
import { buildTrajectoryGeometry, type Rect, type TrajectoryGeometry } from "@/lib/inspect/trajectory";
import type { InspectMetric, NumericMetric } from "@/lib/inspect/metrics";
import { SHAPE_NAME } from "./shapes";

/**
 * Drag & Drop selectors: they decide WHICH data the generic Inspect primitives show.
 *  - Every attempt is its own segment/track: trajectories and velocity/acceleration never join two
 *    drags, even of the same item.
 *  - Labels name the item and its attempt number ("Circle · attempt 2").
 */

export function attemptLabel(challenge: DragDropChallenge, a: DragAttempt): string {
  const kind = challenge.items.find((i) => i.id === a.itemId)?.kind;
  return `${kind ? SHAPE_NAME[kind] : a.itemId} · attempt ${a.attemptOfItem}`;
}

export const OUTCOME_TEXT: Record<DragAttemptOutcome, string> = {
  correct: "Dropped on its matching target",
  "wrong-target": "Dropped on the wrong target",
  miss: "Dropped away from any drop area (returned)",
  cancelled: "Cancelled (returned)",
};

export function attemptLabels(challenge: DragDropChallenge, analysis: DragDropAnalysis): string[] {
  return analysis.attempts.map((a) => attemptLabel(challenge, a));
}

export function dragDropMotionSeries(analysis: DragDropAnalysis): MotionSeries {
  return buildMotionSeries(analysis.attempts.map((a) => a.track));
}

/** Time range covered by drags (the charts' x axis), or null when there were none. */
export function dragDomain(analysis: DragDropAnalysis): [number, number] | null {
  if (analysis.attempts.length === 0) return null;
  return [Math.min(...analysis.attempts.map((a) => a.startT)), Math.max(...analysis.attempts.map((a) => a.endT))];
}

export function buildDragDropTrajectory(analysis: DragDropAnalysis, layout: DragDropLayout): TrajectoryGeometry & { surface: Rect } {
  const surface: Rect = { x: 0, y: 0, width: layout.width, height: layout.height };
  return { ...buildTrajectoryGeometry(analysis.attempts.map((a) => a.track), [surface]), surface };
}

/** Selected event index -> the pointer position it recorded, for the trajectory marker. */
export function selectedPoint(session: InteractionSession, index: number | null): { x: number; y: number } | null {
  const e = index === null ? undefined : session.events[index];
  return e && "x" in e ? { x: e.x, y: e.y } : null;
}

export function dragDropMetrics(f: DragDropFeatures): InspectMetric[] {
  const numeric: NumericMetric[] = [
    { id: "reactionTime", label: "Reaction time", value: f.reactionTime, unit: "ms", hint: "to first drag", description: "Time from the start of the session to the first press on a draggable item." },
    { id: "timeToAllCorrect", label: "Time to all correct", value: f.timeToAllCorrect, unit: "ms", description: "Release time of the drag after which every item is on its matching target and stays so." },
    { id: "numberOfDragAttempts", label: "Drag attempts", value: f.numberOfDragAttempts, unit: "count" },
    { id: "successfulDropCount", label: "Successful drops", value: f.successfulDropCount, unit: "count" },
    { id: "failedDropCount", label: "Failed drops", value: f.failedDropCount, unit: "count", description: "Released drags that did not end on the item's matching target." },
    { id: "cancelledDragCount", label: "Cancelled drags", value: f.cancelledDragCount, unit: "count", description: "Drags that did not end in a release. Not counted as failed drops." },
    { id: "totalDragDuration", label: "Total drag duration", value: f.totalDragDuration, unit: "ms", hint: "released drags" },
    { id: "meanDragDuration", label: "Mean drag duration", value: f.meanDragDuration, unit: "ms" },
    { id: "totalDragDistance", label: "Total pointer distance", value: f.totalDragDistance, unit: "px", hint: "released drags" },
    { id: "meanDragDistance", label: "Mean drag distance", value: f.meanDragDistance, unit: "px" },
    { id: "meanReleaseError", label: "Mean release error", value: f.meanReleaseError, unit: "px", description: "Distance between where the item was released and the center of its own target." },
    { id: "maxReleaseError", label: "Max release error", value: f.maxReleaseError, unit: "px" },
    { id: "directionChanges", label: "Direction changes", value: f.directionChanges, unit: "count" },
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    { id: "completionTime", label: "Session duration", value: f.completionTime, unit: "ms", hint: "since challenge shown" },
  ];
  return [...numeric, { id: "inputModality", label: "Input modality", text: f.inputModality }];
}

export interface AttemptRow {
  id: string;
  index: number;
  label: string;
  outcome: string;
  duration: number | null;
  releaseError: number | null;
}

/** One row per attempt for the accessible attempts table. Duration/error are null for cancelled drags. */
export function attemptRows(challenge: DragDropChallenge, analysis: DragDropAnalysis): AttemptRow[] {
  return analysis.attempts.map((a) => ({
    id: `${a.index}`,
    index: a.index,
    label: attemptLabel(challenge, a),
    outcome: OUTCOME_TEXT[a.outcome],
    duration: a.outcome === "cancelled" ? null : a.endT - a.startT,
    releaseError: a.releaseError,
  }));
}
