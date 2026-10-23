import type { ImageGridFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

/** Toggle a cell id in an ordered selection (returns a new array). */
export function toggleCell(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

/** Next focus index for an arrow key on a size x size grid; null for other keys. Stops at the edges. */
export function moveFocus(index: number, key: string, size: number): number | null {
  const row = Math.floor(index / size);
  const col = index % size;
  switch (key) {
    case "ArrowLeft": return col > 0 ? index - 1 : index;
    case "ArrowRight": return col < size - 1 ? index + 1 : index;
    case "ArrowUp": return row > 0 ? index - size : index;
    case "ArrowDown": return row < size - 1 ? index + size : index;
    case "Home": return row * size;
    case "End": return row * size + size - 1;
    default: return null;
  }
}

/** Metrics shown by the generic MetricTable for the image grid. Null shows as a dash. */
export function imageGridMetrics(f: ImageGridFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm đầu tiên", "to first press") },
    { id: "timeToFirstSelection", label: t("Thời gian đến lần chọn đầu tiên", "Time to first selection"), value: f.timeToFirstSelection, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "selectionCount", label: t("Số ảnh đã chọn", "Selected images"), value: f.selectionCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần bỏ chọn", "Deselections"), value: f.correctionCount, unit: "count", description: t("Số lần bấm để bỏ một lựa chọn.", "Toggles that removed a selection.") },
    { id: "interClickTimeMean", label: t("Thời gian trung bình giữa các lần bấm", "Mean time between toggles"), value: f.interClickTimeMean, unit: "ms" },
    { id: "attemptCount", label: t("Số đợt chọn", "Selection rounds"), value: f.attemptCount, unit: "count", description: t("Các đợt bấm cách nhau hơn 5 giây.", "Runs of toggles separated by more than 5 s.") },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
