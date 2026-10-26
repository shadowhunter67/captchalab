import type { AudioFeatures } from "@captchalab/captcha-plugins";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric } from "@/lib/inspect/metrics";
import type { PlayerState } from "./audio-player";

/** Label of the Play button: "Play" the first time, "Replay" afterwards. */
export function playLabel(played: boolean, t: Translate = EN): string {
  return played ? t("Phát lại", "Replay") : t("Phát", "Play");
}

/** Text of the aria-live status next to the Play button. */
export function statusText(state: PlayerState, t: Translate = EN): string {
  if (state === "playing") return t("Đang phát…", "Playing…");
  if (state === "loading") return t("Đang tải âm thanh…", "Loading audio…");
  return t("Sẵn sàng", "Ready");
}

/** Metrics shown by the generic MetricTable for the Audio CAPTCHA. Null shows as a dash. */
export function audioMetrics(f: AudioFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm Phát hoặc phím đầu tiên", "to first Play press or key") },
    { id: "timeToFirstPlay", label: t("Thời gian đến lần phát đầu", "Time to first play"), value: f.timeToFirstPlay, unit: "ms" },
    { id: "playCount", label: t("Số lần phát", "Plays"), value: f.playCount, unit: "count", description: t("Số lần bấm Phát hoặc Phát lại.", "Presses of Play and Replay.") },
    { id: "timeToFirstKey", label: t("Thời gian đến ký tự đầu tiên", "Time to first character"), value: f.timeToFirstKey, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "keyCount", label: t("Phím ký tự", "Character keys"), value: f.keyCount, unit: "count" },
    { id: "backspaceCount", label: t("Backspace / Delete", "Backspace / Delete"), value: f.backspaceCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần sửa", "Corrections"), value: f.correctionCount, unit: "count", description: t("Xóa sau khi đã gõ một nội dung nào đó.", "Deletes after something was typed.") },
    { id: "attemptCount", label: t("Đợt gõ", "Typing bursts"), value: f.attemptCount, unit: "count", description: t("Các chuỗi nhấn phím cách nhau hơn 5 s.", "Runs of key presses separated by more than 5 s.") },
    { id: "timeFromLastPlayToEnd", label: t("Từ lần phát cuối đến khi kết thúc", "Last play to end"), value: f.timeFromLastPlayToEnd, unit: "ms" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
