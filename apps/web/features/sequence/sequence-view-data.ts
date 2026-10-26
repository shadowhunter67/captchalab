import type { GridShape, SequenceAnswer, SequenceFeatures } from "@captchalab/captcha-plugins";
import { parseStrictInteger } from "@captchalab/captcha-plugins";
import { SHAPE_NAMES } from "@/components/ShapeGlyph";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** Id sent when nothing is chosen: the verifier answers "not one of the options". */
export const NO_OPTION_ID = "none";

export function shapeName(shape: GridShape, t: Translate = EN): string {
  const [vi, en] = SHAPE_NAMES[shape];
  return t(vi, en);
}

/** Activating the chosen option clears it; activating another one replaces it (same rule as the feature extractor). */
export function toggleOption(chosen: string | null, id: string): string | null {
  return chosen === id ? null : id;
}

/** The sequence read out in words, e.g. "2, 4, 6, missing, 10". */
export function spokenNumberSequence(terms: readonly (number | null)[], t: Translate = EN): string {
  return terms.map((x) => (x === null ? t("còn thiếu", "missing") : String(x))).join(", ");
}

export function spokenShapeSequence(cells: readonly (GridShape | null)[], t: Translate = EN): string {
  return cells.map((c) => (c === null ? t("còn thiếu", "missing") : shapeName(c, t))).join(", ");
}

export function optionLabel(index: number, total: number, shape: GridShape, t: Translate = EN): string {
  return t(`Lựa chọn ${index + 1} trên ${total}: ${shapeName(shape, t)}`, `Option ${index + 1} of ${total}: ${shapeName(shape, t)}`);
}

/** Typed text -> answer. Text that is not a whole number becomes NaN, which the verifier rejects with a reason. */
export function numberAnswer(text: string): SequenceAnswer {
  const n = parseStrictInteger(text);
  return { kind: "number", value: n === null ? Number.NaN : n };
}

export function optionAnswer(chosen: string | null): SequenceAnswer {
  return { kind: "option", optionId: chosen ?? NO_OPTION_ID };
}

/** Metrics for the variant: rows that do not apply to it are left out. Null shows as a dash. */
export function sequenceMetrics(f: SequenceFeatures, kind: "number" | "visual", t: Translate = EN): InspectMetric[] {
  const number = kind === "number";
  const rows: InspectMetric[] = [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: number ? t("đến phím đầu tiên", "to first key") : t("đến lần bấm đầu tiên", "to first press") },
  ];
  if (number) rows.push({ id: "timeToFirstKey", label: t("Thời gian đến ký tự đầu tiên", "Time to first character"), value: f.timeToFirstKey, unit: "ms" });
  else rows.push({ id: "timeToFirstSelection", label: t("Thời gian đến lần chọn đầu tiên", "Time to first selection"), value: f.timeToFirstSelection, unit: "ms" });
  rows.push({ id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") });
  if (number) {
    rows.push(
      { id: "keyCount", label: t("Phím ký tự", "Character keys"), value: f.keyCount, unit: "count" },
      { id: "backspaceCount", label: t("Backspace / Delete", "Backspace / Delete"), value: f.backspaceCount, unit: "count" },
    );
  } else {
    rows.push({ id: "selectionCount", label: t("Số lần chọn", "Selections"), value: f.selectionCount, unit: "count" });
  }
  rows.push(
    {
      id: "correctionCount",
      label: t("Số lần sửa", "Corrections"),
      value: f.correctionCount,
      unit: "count",
      description: number ? t("Xóa sau khi đã gõ một nội dung nào đó.", "Deletes after something was typed.") : t("Lựa chọn bị thay hoặc bỏ chọn.", "A choice that replaced or cleared an earlier one."),
    },
    { id: "interActionTimeMean", label: t("Thời gian trung bình giữa các thao tác", "Mean time between actions"), value: f.interActionTimeMean, unit: "ms" },
    { id: "attemptCount", label: t("Số đợt thao tác", "Attempt rounds"), value: f.attemptCount, unit: "count", description: t("Các đợt thao tác cách nhau hơn 5 giây.", "Runs of actions separated by more than 5 s.") },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  );
  return rows;
}
