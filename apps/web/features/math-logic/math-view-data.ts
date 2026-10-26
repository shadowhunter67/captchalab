import type { MathExpr, MathLogicFeatures, MathOp } from "@captchalab/captcha-plugins";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric } from "@/lib/inspect/metrics";

const PRECEDENCE: Record<MathOp, number> = { "+": 1, "-": 1, "*": 2 };

/**
 * Spoken form of an expression tree for assistive tech, e.g. "open bracket 7 plus 5 close bracket times 2".
 * Brackets follow the same rule as the plugin's formatExpr (only where precedence needs them). Built from the
 * tree, never by parsing the displayed text.
 */
export function speakExpr(e: MathExpr, t: Translate = EN): string {
  const word = (op: MathOp): string => (op === "+" ? t("cộng", "plus") : op === "-" ? t("trừ", "minus") : t("nhân", "times"));
  const show = (x: MathExpr, parent: MathOp | null, side: "left" | "right"): string => {
    if (x.kind === "num") return String(x.value);
    const text = `${show(x.left, x.op, "left")} ${word(x.op)} ${show(x.right, x.op, "right")}`;
    if (parent === null) return text;
    const lower = PRECEDENCE[x.op] < PRECEDENCE[parent];
    const sameOnRight = PRECEDENCE[x.op] === PRECEDENCE[parent] && side === "right" && (parent === "-" || (parent === "*" && x.op !== "*"));
    return lower || sameOnRight ? `${t("mở ngoặc", "open bracket")} ${text} ${t("đóng ngoặc", "close bracket")}` : text;
  };
  return show(e, null, "left");
}

/** Metrics shown by the generic MetricTable for the Math / Logic CAPTCHA. Null shows as a dash. */
export function mathMetrics(f: MathLogicFeatures, t: Translate = EN): InspectMetric[] {
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
