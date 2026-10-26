import type { GridShape, MemoryChallenge, MemoryFeatures } from "@captchalab/captcha-plugins";
import { SHAPE_NAMES } from "@/components/ShapeGlyph";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** ready: nothing to remember is shown. preview: the content is visible. recall: the content is hidden. */
export type MemoryPhase = "ready" | "preview" | "recall";
export type MemoryPhaseEvent = "start" | "timeout" | "reset";

/** The only legal phase transitions; anything else (a second Start, a stale timeout) leaves the phase alone. */
export function nextPhase(phase: MemoryPhase, event: MemoryPhaseEvent): MemoryPhase {
  if (event === "reset") return "ready";
  if (event === "start") return phase === "ready" ? "preview" : phase;
  return phase === "preview" ? "recall" : phase;
}

/** Whole seconds shown to the user for the preview length (rounded up, at least 1). */
export function previewSeconds(previewMs: number): number {
  return Math.max(1, Math.ceil(previewMs / 1000));
}

export function previewStatus(previewMs: number, kind: MemoryChallenge["kind"], t: Translate = EN): string {
  const s = previewSeconds(previewMs);
  return kind === "sequence"
    ? t(`Hãy ghi nhớ dãy hình và thứ tự. Dãy sẽ ẩn sau khoảng ${s} giây.`, `Memorise the shapes and their order. They will be hidden in about ${s} s.`)
    : t(`Hãy ghi nhớ các ô được tô sáng. Chúng sẽ ẩn sau khoảng ${s} giây.`, `Memorise the highlighted cells. They will be hidden in about ${s} s.`);
}

export function recallStatus(kind: MemoryChallenge["kind"], t: Translate = EN): string {
  return kind === "sequence"
    ? t("Nhớ lại: chọn các hình theo đúng thứ tự đã thấy.", "Recall: choose the shapes in the order you saw them.")
    : t("Nhớ lại: bật các ô đã được tô sáng.", "Recall: select the cells that were highlighted.");
}

export function shapeName(shape: GridShape, t: Translate = EN): string {
  const [vi, en] = SHAPE_NAMES[shape];
  return t(vi, en);
}

export interface PreviewItem {
  /** 1-based position in the sequence. */
  n: number;
  optionId: string;
  shape: GridShape;
}

/** The sequence in order with the shape of each item. Empty for position memory. */
export function previewItems(challenge: MemoryChallenge): PreviewItem[] {
  if (challenge.kind !== "sequence") return [];
  return challenge.sequence.map((optionId, i) => {
    const option = challenge.options.find((o) => o.id === optionId);
    return { n: i + 1, optionId, shape: option?.shape ?? "circle" };
  });
}

/** Cell ids of a size x size grid, row by row: c1..c<size*size>. */
export function cellIds(size: number): string[] {
  return Array.from({ length: size * size }, (_, i) => `c${i + 1}`);
}

export function isLitCell(challenge: MemoryChallenge, id: string): boolean {
  return challenge.kind === "position" && challenge.targets.includes(id);
}

/** Shape of an option id, for the chosen-so-far slots. */
export function optionShape(challenge: MemoryChallenge, id: string): GridShape | null {
  return challenge.kind === "sequence" ? (challenge.options.find((o) => o.id === id)?.shape ?? null) : null;
}

export function optionLabel(index: number, total: number, shape: GridShape, chosen: boolean, t: Translate = EN): string {
  const base = t(`Lựa chọn ${index + 1} trên ${total}: ${shapeName(shape, t)}`, `Option ${index + 1} of ${total}: ${shapeName(shape, t)}`);
  return chosen ? `${base}${t(" (đã chọn)", " (chosen)")}` : base;
}

export function cellLabel(id: string, size: number, t: Translate = EN): string {
  const n = Number(id.slice(1));
  const row = Math.floor((n - 1) / size) + 1;
  const col = ((n - 1) % size) + 1;
  return t(`Ô hàng ${row}, cột ${col}`, `Cell row ${row}, column ${col}`);
}

export function slotLabel(n: number, total: number, shape: GridShape | null, t: Translate = EN): string {
  return shape === null
    ? t(`Vị trí ${n} trên ${total}: trống`, `Slot ${n} of ${total}: empty`)
    : t(`Vị trí ${n} trên ${total}: ${shapeName(shape, t)}`, `Slot ${n} of ${total}: ${shapeName(shape, t)}`);
}

/** All metrics of the feature set (the same rows for both variants). Null shows as a dash. */
export function memoryMetrics(f: MemoryFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "reactionTime", label: t("Thời gian phản ứng", "Reaction time"), value: f.reactionTime, unit: "ms", hint: t("đến lần bấm đầu tiên", "to first press") },
    { id: "recallDuration", label: t("Thời lượng nhớ lại", "Recall duration"), value: f.recallDuration, unit: "ms", hint: t("từ lúc nội dung ẩn đi", "from when the content was hidden") },
    { id: "timeToFirstSelection", label: t("Thời gian đến lần chọn đầu tiên", "Time to first selection"), value: f.timeToFirstSelection, unit: "ms", hint: t("từ lúc nội dung ẩn đi", "from when the content was hidden") },
    { id: "completionTime", label: t("Thời gian hoàn thành", "Completion time"), value: f.completionTime, unit: "ms", hint: t("của phiên cho đến nay", "session so far") },
    { id: "selectionCount", label: t("Số lần chọn", "Selections"), value: f.selectionCount, unit: "count" },
    { id: "correctSelections", label: t("Lần chọn đúng", "Correct selections"), value: f.correctSelections, unit: "count", description: t("Đúng tại thời điểm chọn.", "Right at the moment they were made.") },
    { id: "incorrectSelections", label: t("Lần chọn sai", "Incorrect selections"), value: f.incorrectSelections, unit: "count" },
    { id: "correctionCount", label: t("Số lần sửa", "Corrections"), value: f.correctionCount, unit: "count", description: t("Hoàn tác, xoá hoặc bỏ chọn một ô.", "Undo, Clear, or deselecting a cell.") },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
