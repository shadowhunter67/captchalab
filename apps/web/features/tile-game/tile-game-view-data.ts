import { ORIENTATION_NAME, PATTERN_NAME, SHAPE_NAME, type GlyphAttr, type GlyphLook, type TileGameChallenge, type TileGameFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

const ATTR_NAME: Record<GlyphAttr, readonly [vi: string, en: string]> = {
  shape: ["hình", "shape"],
  pattern: ["họa tiết", "pattern"],
  orientation: ["hướng", "orientation"],
};

/** The instruction for the current board. */
export function instructionText(c: Pick<TileGameChallenge, "kind" | "required" | "ruleAttr">, t: Translate = EN): string {
  if (c.kind === "pair") return t("Đúng hai ô trông giống hệt nhau (cùng hình, họa tiết và hướng). Chọn cả hai rồi bấm Xác minh.", "Exactly two tiles look identical (same shape, pattern and orientation). Select both, then press Verify.");
  const attr = c.ruleAttr ? t(...ATTR_NAME[c.ruleAttr]) : "";
  return t(`Chọn ${c.required} ô có cùng ${attr} với ô mẫu rồi bấm Xác minh. Các thuộc tính khác có thể khác.`, `Select the ${c.required} tiles with the same ${attr} as the reference tile, then press Verify. Other attributes may differ.`);
}

export function lookLabel(look: GlyphLook, t: Translate = EN): string {
  return `${t(...SHAPE_NAME[look.shape])}, ${t(...PATTERN_NAME[look.pattern])}, ${t(...ORIENTATION_NAME[look.orientation])}`;
}

export function tileLabel(look: GlyphLook, index: number, total: number, selected: boolean, t: Translate = EN): string {
  return `${t(`Ô ${index + 1} trên ${total}`, `Tile ${index + 1} of ${total}`)}: ${lookLabel(look, t)}${selected ? t(", đã chọn", ", selected") : ""}`;
}

export function statusText(selected: number, required: number, t: Translate = EN): string {
  return t(`Đã chọn ${selected} trên ${required} ô`, `${selected} of ${required} tiles selected`);
}

export function tileGameMetrics(f: TileGameFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm đầu tiên", "to first press") },
    { id: "firstSelectionTime", label: t("Thời gian đến lần chọn đầu tiên", "Time to first selection"), value: f.firstSelectionTime, unit: "ms" },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "selectionCount", label: t("Số lần chọn ô", "Tile selections"), value: f.selectionCount, unit: "count" },
    { id: "correctPairCount", label: t("Số lần chọn đủ ô và đúng", "Complete selections, right"), value: f.correctPairCount, unit: "count" },
    { id: "wrongPairCount", label: t("Số lần chọn đủ ô nhưng sai", "Complete selections, wrong"), value: f.wrongPairCount, unit: "count" },
    { id: "correctionCount", label: t("Số lần bỏ chọn", "Deselections"), value: f.correctionCount, unit: "count" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
