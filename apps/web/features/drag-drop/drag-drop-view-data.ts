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
import { EN, type Translate } from "@/lib/i18n";
import { shapeName } from "./shapes";

/**
 * Drag & Drop selectors: they decide WHICH data the generic Inspect primitives show.
 *  - Every attempt is its own segment/track: trajectories and velocity/acceleration never join two
 *    drags, even of the same item.
 *  - Labels name the item and its attempt number ("Circle · attempt 2").
 */

export function attemptLabel(challenge: DragDropChallenge, a: DragAttempt, t: Translate = EN): string {
  const kind = challenge.items.find((i) => i.id === a.itemId)?.kind;
  return `${kind ? shapeName(kind, t) : a.itemId} · ${t("lần thử", "attempt")} ${a.attemptOfItem}`;
}

export const OUTCOME_TEXT: Record<DragAttemptOutcome, string> = {
  correct: "Dropped on its matching target",
  "wrong-target": "Dropped on the wrong target",
  miss: "Dropped away from any drop area (returned)",
  cancelled: "Cancelled (returned)",
};

export function outcomeText(outcome: DragAttemptOutcome, t: Translate = EN): string {
  switch (outcome) {
    case "correct":
      return t("Thả đúng vào đích của nó", OUTCOME_TEXT.correct);
    case "wrong-target":
      return t("Thả nhầm đích", OUTCOME_TEXT["wrong-target"]);
    case "miss":
      return t("Thả ra ngoài mọi vùng thả (quay về chỗ cũ)", OUTCOME_TEXT.miss);
    case "cancelled":
      return t("Đã hủy (quay về chỗ cũ)", OUTCOME_TEXT.cancelled);
  }
}

export function attemptLabels(challenge: DragDropChallenge, analysis: DragDropAnalysis, t: Translate = EN): string[] {
  return analysis.attempts.map((a) => attemptLabel(challenge, a, t));
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

export function dragDropMetrics(f: DragDropFeatures, t: Translate = EN): InspectMetric[] {
  const numeric: NumericMetric[] = [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần kéo đầu tiên", "to first drag"), description: t("Thời gian từ lúc bắt đầu phiên đến lần nhấn đầu tiên vào một hình kéo được.", "Time from the start of the session to the first press on a draggable item.") },
    { id: "timeToAllCorrect", label: t("Thời gian để đặt đúng hết", "Time to all correct"), value: f.timeToAllCorrect, unit: "ms", description: t("Thời điểm thả của lần kéo sau đó mọi hình đều nằm đúng đích và giữ nguyên.", "Release time of the drag after which every item is on its matching target and stays so.") },
    { id: "numberOfDragAttempts", label: t("Số lần kéo", "Drag attempts"), value: f.numberOfDragAttempts, unit: "count" },
    { id: "successfulDropCount", label: t("Số lần thả đúng", "Successful drops"), value: f.successfulDropCount, unit: "count" },
    { id: "failedDropCount", label: t("Số lần thả sai", "Failed drops"), value: f.failedDropCount, unit: "count", description: t("Các lần kéo đã thả nhưng không dừng ở đúng đích của hình.", "Released drags that did not end on the item's matching target.") },
    { id: "cancelledDragCount", label: t("Số lần kéo bị hủy", "Cancelled drags"), value: f.cancelledDragCount, unit: "count", description: t("Các lần kéo không kết thúc bằng thao tác thả. Không tính là thả sai.", "Drags that did not end in a release. Not counted as failed drops.") },
    { id: "totalDragDuration", label: t("Tổng thời gian kéo", "Total drag duration"), value: f.totalDragDuration, unit: "ms", hint: t("các lần kéo đã thả", "released drags") },
    { id: "meanDragDuration", label: t("Thời gian kéo trung bình", "Mean drag duration"), value: f.meanDragDuration, unit: "ms" },
    { id: "totalDragDistance", label: t("Tổng quãng đường con trỏ", "Total pointer distance"), value: f.totalDragDistance, unit: "px", hint: t("các lần kéo đã thả", "released drags") },
    { id: "meanDragDistance", label: t("Quãng đường kéo trung bình", "Mean drag distance"), value: f.meanDragDistance, unit: "px" },
    { id: "meanReleaseError", label: t("Sai lệch khi thả (trung bình)", "Mean release error"), value: f.meanReleaseError, unit: "px", description: t("Khoảng cách giữa chỗ hình được thả và tâm đích của chính nó.", "Distance between where the item was released and the center of its own target.") },
    { id: "maxReleaseError", label: t("Sai lệch khi thả (lớn nhất)", "Max release error"), value: f.maxReleaseError, unit: "px" },
    { id: "directionChanges", label: t("Số lần đổi hướng", "Direction changes"), value: f.directionChanges, unit: "count" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "completionTime", label: t("Thời gian phiên", "Session duration"), value: f.completionTime, unit: "ms", hint: t("từ lúc hiện thử thách", "since challenge shown") },
  ];
  return [...numeric, { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality }];
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
export function attemptRows(challenge: DragDropChallenge, analysis: DragDropAnalysis, t: Translate = EN): AttemptRow[] {
  return analysis.attempts.map((a) => ({
    id: `${a.index}`,
    index: a.index,
    label: attemptLabel(challenge, a, t),
    outcome: outcomeText(a.outcome, t),
    duration: a.outcome === "cancelled" ? null : a.endT - a.startT,
    releaseError: a.releaseError,
  }));
}
