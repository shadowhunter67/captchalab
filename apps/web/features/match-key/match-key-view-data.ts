import { ORIENTATION_NAME, PATTERN_NAME, SHAPE_NAME, type GlyphAttr, type GlyphLook, type MatchKeyFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

const ATTR_NAME: Record<GlyphAttr, readonly [vi: string, en: string]> = {
  shape: ["hình", "shape"],
  pattern: ["họa tiết", "pattern"],
  orientation: ["hướng", "orientation"],
};

/** "same shape and pattern as the key": the rule the page shows for the current variant. */
export function ruleText(keyAttrs: readonly GlyphAttr[], t: Translate = EN): string {
  const names = keyAttrs.map((a) => t(...ATTR_NAME[a]));
  if (keyAttrs.length === 3) return t("Chọn lựa chọn giống hệt hình mẫu về hình, họa tiết và hướng (cỡ có thể khác).", "Pick the option identical to the key in shape, pattern and orientation (size may differ).");
  const list = names.join(t(" và ", " and "));
  return t(`Chọn lựa chọn có cùng ${list} với hình mẫu. Thuộc tính còn lại và cỡ có thể khác.`, `Pick the option with the same ${list} as the key. The other attribute and the size may differ.`);
}

/** Spoken description of a look, for the button labels. */
export function lookLabel(look: GlyphLook, t: Translate = EN): string {
  return `${t(...SHAPE_NAME[look.shape])}, ${t(...PATTERN_NAME[look.pattern])}, ${t(...ORIENTATION_NAME[look.orientation])}`;
}

export function matchKeyMetrics(f: MatchKeyFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm đầu tiên", "to first press") },
    { id: "timeToFirstSelection", label: t("Thời gian đến lần chọn đầu tiên", "Time to first selection"), value: f.timeToFirstSelection, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "selectionCount", label: t("Số lần chọn", "Selections"), value: f.selectionCount, unit: "count" },
    { id: "wrongSelectionCount", label: t("Số lần chọn sai", "Wrong selections"), value: f.wrongSelectionCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần sửa", "Corrections"), value: f.correctionCount, unit: "count", description: t("Lần chọn thay một lần chọn khác, cộng với lần bỏ chọn.", "Selections that replaced another one, plus selections cleared.") },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
