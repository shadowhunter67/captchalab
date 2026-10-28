import type { Translate } from "@/lib/i18n";
import { EN } from "@/lib/i18n";
import type { LabTaskId, SignalGroup, SignalUnit } from "./types";

export interface SignalDef {
  id: string;
  group: SignalGroup;
  unit: SignalUnit;
  label: string;
  labelVi: string;
  description: string;
  descriptionVi: string;
}

const s = (id: string, group: SignalGroup, unit: SignalUnit, label: string, labelVi: string, description: string, descriptionVi: string): SignalDef => ({
  id, group, unit, label, labelVi, description, descriptionVi,
});

/**
 * Every signal the Behavioral Lab can show, defined once. A CAPTCHA uses the subset listed in SIGNALS_BY_CAPTCHA;
 * none has to have them all. All are descriptive measurements of one interaction, not verdicts.
 */
export const SIGNAL_CATALOG: readonly SignalDef[] = [
  s("reactionTime", "timing", "ms", "Reaction time", "Thời gian phản ứng", "Time from the start to the first interaction.", "Thời gian từ lúc bắt đầu đến thao tác đầu tiên."),
  s("completionTime", "timing", "ms", "Completion time", "Thời gian hoàn thành", "Time from the start to the end of the session.", "Thời gian từ lúc bắt đầu đến khi kết thúc phiên."),
  s("activationTime", "timing", "ms", "Time to first activation", "Thời gian tới lần kích hoạt đầu", "Time until the first completed activation, selection or play.", "Thời gian tới lần kích hoạt, lựa chọn hoặc phát hoàn chỉnh đầu tiên."),
  s("pressDuration", "timing", "ms", "Press duration", "Thời gian giữ", "How long the activating press was held.", "Thời gian giữ lần nhấn kích hoạt."),
  s("interClickMean", "timing", "ms", "Mean time between selections", "Thời gian trung bình giữa các lần chọn", "Mean gap between consecutive selections.", "Khoảng cách trung bình giữa các lần chọn liên tiếp."),
  s("interKeyMean", "timing", "ms", "Mean time between keys", "Thời gian trung bình giữa các phím", "Mean gap between consecutive character keys.", "Khoảng cách trung bình giữa các phím ký tự liên tiếp."),
  s("dragDurationMean", "timing", "ms", "Mean drag duration", "Thời lượng kéo trung bình", "Mean time from picking an item up to releasing it.", "Thời gian trung bình từ lúc nhấc vật đến lúc thả."),

  s("pointerDistance", "motion", "px", "Pointer distance", "Quãng đường con trỏ", "Total length of the pointer path.", "Tổng chiều dài đường đi của con trỏ."),
  s("meanVelocity", "motion", "px/s", "Mean velocity", "Vận tốc trung bình", "Path length divided by movement time.", "Chiều dài đường đi chia cho thời gian di chuyển."),
  s("maxVelocity", "motion", "px/s", "Max velocity", "Vận tốc lớn nhất", "Fastest segment of the path.", "Đoạn nhanh nhất của đường đi."),
  s("speedCv", "motion", "ratio", "Velocity variation", "Mức biến thiên vận tốc", "Standard deviation of segment speeds divided by their mean (0 = constant speed).", "Độ lệch chuẩn của vận tốc từng đoạn chia cho trung bình (0 = tốc độ không đổi)."),
  s("maxAcceleration", "motion", "px/s²", "Max acceleration", "Gia tốc lớn nhất", "Largest change of speed between consecutive segments.", "Mức thay đổi tốc độ lớn nhất giữa các đoạn liên tiếp."),
  s("straightness", "motion", "ratio", "Path straightness", "Độ thẳng của đường đi", "Straight-line distance divided by path length (1 = perfectly straight).", "Khoảng cách đường thẳng chia cho chiều dài đường đi (1 = hoàn toàn thẳng)."),
  s("angularMeanVelocity", "motion", "deg/s", "Mean angular velocity", "Vận tốc góc trung bình", "Degrees turned per second while dragging.", "Số độ xoay mỗi giây khi kéo."),
  s("angularMaxVelocity", "motion", "deg/s", "Max angular velocity", "Vận tốc góc lớn nhất", "Fastest turn between two samples.", "Lần xoay nhanh nhất giữa hai mẫu."),
  s("angularSpeedCv", "motion", "ratio", "Angular velocity variation", "Mức biến thiên vận tốc góc", "Standard deviation of angular speeds divided by their mean.", "Độ lệch chuẩn của vận tốc góc chia cho trung bình."),

  s("directionChanges", "correction", "count", "Direction changes", "Số lần đổi hướng", "Turns sharper than 45 degrees along the path.", "Các khúc rẽ gắt hơn 45 độ dọc theo đường đi."),
  s("corrections", "correction", "count", "Corrections", "Số lần chỉnh lại", "Reversals of direction, deselections, deleted characters or missed clicks, depending on the task.", "Số lần đảo chiều, bỏ chọn, xoá ký tự hoặc bấm trượt, tuỳ nhiệm vụ."),
  s("overshoot", "correction", "px", "Overshoot", "Vượt quá đích", "Farthest the pointer went past the target.", "Điểm con trỏ đi xa nhất quá đích."),
  s("releaseError", "correction", "px", "Release error", "Sai lệch khi thả", "Distance from the target when released.", "Khoảng cách tới đích lúc thả."),
  s("finalAngularError", "correction", "deg", "Final angular error", "Sai lệch góc cuối", "Shortest angular distance to upright at the end.", "Khoảng cách góc ngắn nhất tới vị trí thẳng đứng lúc cuối."),

  s("sampleIntervalCv", "rhythm", "ratio", "Sample timing variation", "Mức biến thiên thời gian mẫu", "Variation of the time between pointer samples (0 = perfectly regular).", "Mức biến thiên thời gian giữa các mẫu con trỏ (0 = hoàn toàn đều)."),
  s("interClickCv", "rhythm", "ratio", "Selection rhythm variation", "Mức biến thiên nhịp chọn", "Variation of the gaps between selections (0 = perfectly regular).", "Mức biến thiên khoảng cách giữa các lần chọn (0 = hoàn toàn đều)."),
  s("interKeyCv", "rhythm", "ratio", "Typing rhythm variation", "Mức biến thiên nhịp gõ", "Variation of the gaps between character keys (0 = perfectly regular).", "Mức biến thiên khoảng cách giữa các phím ký tự (0 = hoàn toàn đều)."),
  s("dragDurationCv", "rhythm", "ratio", "Drag duration variation", "Mức biến thiên thời lượng kéo", "Variation of the duration of each drag.", "Mức biến thiên thời lượng của từng lần kéo."),
  s("pauseCount", "rhythm", "count", "Pauses", "Số lần dừng", "Gaps longer than one second between selections or keys.", "Số khoảng dừng dài hơn một giây giữa các lần chọn hoặc phím."),

  s("attemptCount", "attempts", "count", "Attempts", "Số lần thử", "How many separate attempts the session contains.", "Phiên có bao nhiêu lần thử riêng biệt."),
  s("activationCount", "attempts", "count", "Activations", "Số lần kích hoạt", "Completed activations or selections.", "Số lần kích hoạt hoặc lựa chọn hoàn chỉnh."),
  s("failedDropCount", "attempts", "count", "Failed drops", "Số lần thả hỏng", "Drops that did not land on the matching area.", "Số lần thả không rơi đúng vùng."),
  s("wrongAttempts", "attempts", "count", "Wrong attempts", "Số lần sai", "Choices that were not right when made (a wrong pairing or a wrong recalled item).", "Số lựa chọn sai ngay lúc chọn (ghép sai hoặc nhớ sai)."),
  s("playCount", "attempts", "count", "Plays", "Số lần phát", "Times the audio was played or replayed.", "Số lần phát hoặc phát lại âm thanh."),
  s("cancelledDragCount", "attempts", "count", "Cancelled drags", "Số lần kéo bị huỷ", "Drags that ended without a release.", "Số lần kéo kết thúc mà không thả."),
];

const BY_ID = new Map(SIGNAL_CATALOG.map((d) => [d.id, d]));

export function signalDef(id: string): SignalDef | undefined {
  return BY_ID.get(id);
}

export const signalLabel = (id: string, t: Translate = EN): string => {
  const d = BY_ID.get(id);
  return d ? t(d.labelVi, d.label) : id;
};

export const signalDescription = (id: string, t: Translate = EN): string => {
  const d = BY_ID.get(id);
  return d ? t(d.descriptionVi, d.description) : "";
};

/** Which signals a CAPTCHA reports, in display order. The "input" group is the vector's inputModality. */
export const SIGNALS_BY_CAPTCHA: Readonly<Record<LabTaskId, readonly string[]>> = {
  invisible: ["reactionTime", "completionTime", "pointerDistance", "meanVelocity", "speedCv", "straightness", "directionChanges", "corrections", "sampleIntervalCv", "interClickMean", "interClickCv", "attemptCount"],
  slider: ["reactionTime", "completionTime", "pointerDistance", "meanVelocity", "maxVelocity", "speedCv", "maxAcceleration", "straightness", "directionChanges", "corrections", "overshoot", "releaseError", "sampleIntervalCv", "attemptCount"],
  "drag-drop": ["reactionTime", "completionTime", "dragDurationMean", "pointerDistance", "meanVelocity", "speedCv", "straightness", "directionChanges", "releaseError", "dragDurationCv", "sampleIntervalCv", "attemptCount", "failedDropCount", "cancelledDragCount"],
  checkbox: ["reactionTime", "activationTime", "pressDuration", "completionTime", "interClickMean", "interClickCv", "attemptCount", "activationCount"],
  "image-grid": ["reactionTime", "completionTime", "interClickMean", "corrections", "interClickCv", "pauseCount", "attemptCount", "activationCount"],
  text: ["reactionTime", "completionTime", "interKeyMean", "corrections", "interKeyCv", "pauseCount", "attemptCount", "activationCount"],
  "shape-matching": ["reactionTime", "completionTime", "interClickMean", "corrections", "interClickCv", "pauseCount", "attemptCount", "activationCount", "wrongAttempts"],
  "math-logic": ["reactionTime", "completionTime", "interKeyMean", "corrections", "interKeyCv", "pauseCount", "attemptCount", "activationCount"],
  sequence: ["reactionTime", "completionTime", "interKeyMean", "interClickMean", "corrections", "interKeyCv", "interClickCv", "pauseCount", "attemptCount", "activationCount"],
  memory: ["reactionTime", "activationTime", "completionTime", "interClickMean", "corrections", "interClickCv", "pauseCount", "activationCount", "wrongAttempts"],
  audio: ["reactionTime", "activationTime", "completionTime", "interKeyMean", "corrections", "interKeyCv", "pauseCount", "attemptCount", "activationCount", "playCount"],
  rotation: ["reactionTime", "completionTime", "angularMeanVelocity", "angularMaxVelocity", "angularSpeedCv", "corrections", "finalAngularError", "sampleIntervalCv", "attemptCount"],
};

export const GROUP_LABELS: Readonly<Record<string, readonly [string, string]>> = {
  timing: ["Thời gian", "Timing"],
  motion: ["Chuyển động", "Motion"],
  correction: ["Chỉnh sửa", "Correction"],
  rhythm: ["Nhịp", "Rhythm"],
  attempts: ["Lần thử", "Attempts"],
  input: ["Thiết bị nhập", "Input"],
};

export const groupLabel = (group: string, t: Translate = EN): string => {
  const g = GROUP_LABELS[group];
  return g ? t(g[0], g[1]) : group;
};

/** Format a signal value with its unit. null -> an em dash. */
export function formatSignal(id: string, value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const d = BY_ID.get(id);
  switch (d?.unit) {
    case "ms":
      return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
    case "px":
      return `${value.toFixed(1)} px`;
    case "px/s":
      return `${Math.round(value)} px/s`;
    case "px/s²":
      return `${Math.round(value)} px/s²`;
    case "deg":
      return `${value.toFixed(1)}°`;
    case "deg/s":
      return `${Math.round(value)} °/s`;
    case "ratio":
      return value.toFixed(2);
    default:
      return String(Math.round(value * 100) / 100);
  }
}
