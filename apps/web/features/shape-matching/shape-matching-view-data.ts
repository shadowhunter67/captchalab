import type { MatchState, ShapeMatchingFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

export interface PairNumbers {
  /** source id -> pair number (1-based, in the order the matches were made). */
  bySource: Record<string, number>;
  /** target id -> pair number. */
  byTarget: Record<string, number>;
}

/** Numbers the current matches 1, 2, ... so both ends of a pair show the same badge. */
export function pairNumbers(state: MatchState): PairNumbers {
  const bySource: Record<string, number> = {};
  const byTarget: Record<string, number> = {};
  Object.entries(state.matches).forEach(([s, t], i) => {
    bySource[s] = i + 1;
    byTarget[t] = i + 1;
  });
  return { bySource, byTarget };
}

/** Screen-reader label of a source button, e.g. "Source 2 of 4: star, matched to target 3". */
export function sourceLabel(index: number, total: number, shapeName: string, matchedTargetIndex: number | null, t: Translate = EN): string {
  const base = t(`Hình nguồn ${index + 1} trên ${total}: ${shapeName}`, `Source ${index + 1} of ${total}: ${shapeName}`);
  return matchedTargetIndex === null ? base : `${base}${t(`, đã ghép với đích ${matchedTargetIndex + 1}`, `, matched to target ${matchedTargetIndex + 1}`)}`;
}

/** Screen-reader label of a target button, e.g. "Target 3 of 4: star, matched to source 2". */
export function targetLabel(index: number, total: number, shapeName: string, matchedSourceIndex: number | null, t: Translate = EN): string {
  const base = t(`Đích ${index + 1} trên ${total}: ${shapeName}`, `Target ${index + 1} of ${total}: ${shapeName}`);
  return matchedSourceIndex === null ? base : `${base}${t(`, đã ghép với hình nguồn ${matchedSourceIndex + 1}`, `, matched to source ${matchedSourceIndex + 1}`)}`;
}

/** The aria-live status line. */
export function statusText(state: MatchState, total: number, t: Translate = EN): string {
  const done = Object.keys(state.matches).length;
  const count = t(`Đã ghép ${done} trên ${total} hình`, `${done} of ${total} shapes matched`);
  return state.selected === null ? count : `${t("Đã chọn hình nguồn: hãy chọn đích của nó", "Source selected: pick its target")}. ${count}`;
}

/** Metrics shown by the generic MetricTable for shape matching. Null shows as a dash. */
export function shapeMatchingMetrics(f: ShapeMatchingFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm đầu tiên", "to first press") },
    { id: "timeToFirstMatch", label: t("Thời gian đến lần ghép đầu tiên", "Time to first match"), value: f.timeToFirstMatch, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "selectionCount", label: t("Số lần chọn hình nguồn", "Source selections"), value: f.selectionCount, unit: "count" },
    { id: "matchAttempts", label: t("Số lần ghép", "Match attempts"), value: f.matchAttempts, unit: "count" },
    { id: "correctMatchCount", label: t("Số lần ghép đúng", "Correct matches"), value: f.correctMatchCount, unit: "count" },
    { id: "incorrectMatchCount", label: t("Số lần ghép sai", "Incorrect matches"), value: f.incorrectMatchCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần sửa", "Corrections"), value: f.correctionCount, unit: "count", description: t("Ghép bị thay bằng ghép khác, cộng với ghép bị gỡ.", "Matches replaced by a later one, plus matches removed.") },
    { id: "interActionTimeMean", label: t("Thời gian trung bình giữa các thao tác", "Mean time between actions"), value: f.interActionTimeMean, unit: "ms" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
