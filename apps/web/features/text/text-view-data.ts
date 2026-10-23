import type { TextFeatures } from "@captchalab/captcha-plugins";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** Metrics shown by the generic MetricTable for the text CAPTCHA. Null shows as a dash. */
export function textMetrics(f: TextFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến phím đầu tiên", "to first key") },
    { id: "timeToFirstKey", label: t("Thời gian đến ký tự đầu tiên", "Time to first character"), value: f.timeToFirstKey, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "keyCount", label: t("Phím ký tự", "Character keys"), value: f.keyCount, unit: "count" },
    { id: "backspaceCount", label: t("Backspace / Delete", "Backspace / Delete"), value: f.backspaceCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần sửa", "Corrections"), value: f.correctionCount, unit: "count", description: t("Xóa sau khi đã gõ một nội dung nào đó.", "Deletes after something was typed.") },
    { id: "interKeyTimeMean", label: t("Thời gian trung bình giữa các ký tự", "Mean time between characters"), value: f.interKeyTimeMean, unit: "ms" },
    { id: "attemptCount", label: t("Đợt gõ", "Typing bursts"), value: f.attemptCount, unit: "count", description: t("Các chuỗi nhấn phím cách nhau hơn 5 s.", "Runs of key presses separated by more than 5 s.") },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
