import type { LabTaskId } from "./types";

export interface SignalRule {
  signal: string;
  /** Raw value at which the normalized signal is 0 (lowIsHuman: 1) and 1 (lowIsHuman: 0). */
  lo: number;
  hi: number;
  /** True when a LOW raw value is the human-like end of the range. */
  lowIsHuman?: boolean;
  /**
   * "human": only the human-like end produces evidence; the other end is neutral. For signals where absence is
   * common among people too (no correction, no overshoot) so that "none" proves nothing.
   */
  oneSided?: "human";
  /** Relative importance, 0.5..1.5. */
  weight: number;
  /** What a raw value on the LOW / HIGH side of the range looks like, for the evidence line. [en, vi] */
  low: readonly [string, string];
  high: readonly [string, string];
}

export const CLASSIFIER_VERSION = "behavioral-baseline@1";

const r = (signal: string, lo: number, hi: number, weight: number, low: readonly [string, string], high: readonly [string, string], extra: Partial<SignalRule> = {}): SignalRule => ({
  signal, lo, hi, weight, low, high, ...extra,
});

const SPEED_CV = r("speedCv", 0.05, 0.5, 1, ["speed barely changes along the path", "tốc độ gần như không đổi dọc đường đi"], ["speed varies a lot along the path", "tốc độ thay đổi nhiều dọc đường đi"]);
const SAMPLE_CV = (w = 1.25) => r("sampleIntervalCv", 0.02, 0.25, w, ["pointer samples arrive at almost perfectly regular times", "các mẫu con trỏ đến ở những thời điểm gần như đều tuyệt đối"], ["pointer samples arrive at uneven times", "các mẫu con trỏ đến ở những thời điểm không đều"]);
const REACTION = (lo: number, hi: number, w = 0.5) => r("reactionTime", lo, hi, w, ["very quick first interaction", "thao tác đầu tiên rất nhanh"], ["a longer pause before the first interaction", "dừng lâu hơn trước thao tác đầu tiên"]);

/**
 * Per-CAPTCHA rules. NOT a universal rule set: each CAPTCHA reads the few signals that mean something for its
 * own interaction. The ranges below are configured baselines (see normalize.ts), not fitted to real users.
 */
export const RULES_BY_CAPTCHA: Readonly<Record<LabTaskId, readonly SignalRule[]>> = {
  invisible: [
    SPEED_CV,
    SAMPLE_CV(),
    r("straightness", 0.8, 0.999, 0.5, ["movement between targets is curved", "chuyển động giữa các mục tiêu bị cong"], ["movement between targets is almost perfectly straight", "chuyển động giữa các mục tiêu gần như thẳng tuyệt đối"], { lowIsHuman: true }),
    r("interClickCv", 0.03, 0.3, 1.25, ["clicks arrive at almost exactly equal intervals", "các lần bấm đến ở những khoảng gần như bằng nhau"], ["the gaps between clicks differ", "khoảng cách giữa các lần bấm khác nhau"]),
    r("directionChanges", 0, 6, 0.75, ["no sharp turns while moving", "không có khúc rẽ gắt khi di chuyển"], ["several sharp turns while moving", "có vài khúc rẽ gắt khi di chuyển"], { oneSided: "human" }),
    r("corrections", 0, 2, 0.5, ["no missed click", "không bấm trượt lần nào"], ["some clicks missed the target", "có vài lần bấm trượt mục tiêu"], { oneSided: "human" }),
    REACTION(150, 900),
  ],
  slider: [
    SPEED_CV,
    r("directionChanges", 0, 4, 0.75, ["no sharp turns along the path", "không có khúc rẽ gắt nào dọc đường đi"], ["several sharp turns along the path", "có vài khúc rẽ gắt dọc đường đi"], { oneSided: "human" }),
    r("corrections", 0, 2, 0.75, ["no reversal of direction", "không đảo chiều lần nào"], ["the pointer reversed direction", "con trỏ có đảo chiều"], { oneSided: "human" }),
    r("overshoot", 0, 6, 0.5, ["did not go past the target", "không đi quá đích"], ["went past the target before settling", "đi quá đích rồi mới dừng lại"], { oneSided: "human" }),
    REACTION(150, 900),
    SAMPLE_CV(),
  ],
  "drag-drop": [
    r("dragDurationCv", 0.02, 0.25, 1.25, ["every drag takes almost the same time", "mọi lần kéo mất gần như cùng một thời gian"], ["drag durations differ from drag to drag", "thời lượng mỗi lần kéo khác nhau"]),
    SAMPLE_CV(),
    r("speedCv", 0.1, 0.6, 1, ["speed barely changes along the paths", "tốc độ gần như không đổi dọc các đường đi"], ["speed varies a lot along the paths", "tốc độ thay đổi nhiều dọc các đường đi"]),
    r("straightness", 0.85, 0.995, 1, ["paths are curved", "các đường đi bị cong"], ["paths are almost perfectly straight", "các đường đi gần như thẳng tuyệt đối"], { lowIsHuman: true }),
    r("directionChanges", 0, 6, 0.5, ["no sharp turns", "không có khúc rẽ gắt"], ["several sharp turns", "có vài khúc rẽ gắt"], { oneSided: "human" }),
    r("releaseError", 1, 12, 0.75, ["items were released almost exactly on the centre", "các vật được thả gần như đúng tâm"], ["items were released off-centre", "các vật được thả lệch tâm"]),
    r("failedDropCount", 0, 2, 0.5, ["every drop landed", "mọi lần thả đều trúng"], ["some drops missed", "có vài lần thả trượt"], { oneSided: "human" }),
    REACTION(150, 900),
  ],
  checkbox: [
    REACTION(150, 1200, 1),
    r("pressDuration", 30, 110, 1, ["a very short press", "nhấn rất ngắn"], ["a longer press", "nhấn lâu hơn"]),
    r("interClickCv", 0.02, 0.3, 1.25, ["activations repeat at almost exactly equal intervals", "các lần kích hoạt lặp lại ở những khoảng gần như bằng nhau"], ["activation intervals differ", "các khoảng giữa các lần kích hoạt khác nhau"]),
  ],
  "image-grid": [
    REACTION(150, 1000, 0.75),
    r("interClickMean", 100, 800, 1, ["selections follow each other very quickly", "các lần chọn nối nhau rất nhanh"], ["selections are spaced further apart", "các lần chọn cách nhau xa hơn"]),
    r("interClickCv", 0.03, 0.3, 1.25, ["selections arrive at almost exactly equal intervals", "các lần chọn đến ở những khoảng gần như bằng nhau"], ["the gaps between selections differ", "khoảng cách giữa các lần chọn khác nhau"]),
    r("corrections", 0, 2, 0.75, ["no selection was taken back", "không có lần chọn nào bị bỏ"], ["a selection was taken back", "có lần chọn bị bỏ chọn"], { oneSided: "human" }),
    r("pauseCount", 0, 2, 0.5, ["no long pause between selections", "không có khoảng dừng dài giữa các lần chọn"], ["pauses of over a second between selections", "có khoảng dừng hơn một giây giữa các lần chọn"], { oneSided: "human" }),
  ],
  text: [
    REACTION(150, 800),
    r("interKeyCv", 0.03, 0.3, 1.5, ["keys are struck at almost exactly equal intervals", "các phím được gõ ở những khoảng gần như bằng nhau"], ["the gaps between keys differ", "khoảng cách giữa các phím khác nhau"]),
    r("corrections", 0, 1, 1, ["no character was deleted", "không xoá ký tự nào"], ["a character was deleted and retyped", "có ký tự bị xoá và gõ lại"], { oneSided: "human" }),
    r("pauseCount", 0, 1, 0.5, ["no long pause while typing", "không dừng lâu khi gõ"], ["a pause of over a second while typing", "có lúc dừng hơn một giây khi gõ"], { oneSided: "human" }),
  ],
  // Rules for the CAPTCHAs added in v0.7. The six sets above are frozen exactly as released in v0.5 (a test pins them).
  "shape-matching": [
    REACTION(150, 1000, 0.75),
    r("interClickMean", 100, 800, 1, ["presses follow each other very quickly", "các lần nhấn nối nhau rất nhanh"], ["presses are spaced further apart", "các lần nhấn cách nhau xa hơn"]),
    r("interClickCv", 0.03, 0.3, 1.25, ["presses arrive at almost exactly equal intervals", "các lần nhấn đến ở những khoảng gần như bằng nhau"], ["the gaps between presses differ", "khoảng cách giữa các lần nhấn khác nhau"]),
    r("corrections", 0, 2, 0.75, ["no pairing was replaced", "không có cặp nào bị thay"], ["a pairing was replaced or removed", "có cặp bị thay hoặc bỏ"], { oneSided: "human" }),
    r("wrongAttempts", 0, 2, 0.5, ["every pairing was right when made", "mọi cặp đều đúng ngay lúc ghép"], ["some pairings were wrong when made", "có cặp sai ngay lúc ghép"], { oneSided: "human" }),
    r("pauseCount", 0, 2, 0.5, ["no long pause between presses", "không dừng lâu giữa các lần nhấn"], ["pauses of over a second between presses", "có khoảng dừng hơn một giây giữa các lần nhấn"], { oneSided: "human" }),
  ],
  "math-logic": [
    REACTION(200, 1500),
    r("interKeyCv", 0.03, 0.3, 1.5, ["keys are struck at almost exactly equal intervals", "các phím được gõ ở những khoảng gần như bằng nhau"], ["the gaps between keys differ", "khoảng cách giữa các phím khác nhau"]),
    r("corrections", 0, 1, 1, ["no character was deleted", "không xoá ký tự nào"], ["a character was deleted and retyped", "có ký tự bị xoá và gõ lại"], { oneSided: "human" }),
    r("pauseCount", 0, 1, 0.5, ["no long pause while typing", "không dừng lâu khi gõ"], ["a pause of over a second while typing", "có lúc dừng hơn một giây khi gõ"], { oneSided: "human" }),
  ],
  sequence: [
    REACTION(150, 1500),
    r("interKeyCv", 0.03, 0.3, 1.5, ["keys are struck at almost exactly equal intervals", "các phím được gõ ở những khoảng gần như bằng nhau"], ["the gaps between keys differ", "khoảng cách giữa các phím khác nhau"]),
    r("interClickCv", 0.03, 0.3, 1.25, ["presses arrive at almost exactly equal intervals", "các lần nhấn đến ở những khoảng gần như bằng nhau"], ["the gaps between presses differ", "khoảng cách giữa các lần nhấn khác nhau"]),
    r("corrections", 0, 1, 1, ["no answer was changed or deleted", "không đổi hay xoá đáp án nào"], ["an answer was changed or a character deleted", "có đáp án bị đổi hoặc ký tự bị xoá"], { oneSided: "human" }),
    r("pauseCount", 0, 1, 0.5, ["no long pause", "không dừng lâu"], ["a pause of over a second", "có lúc dừng hơn một giây"], { oneSided: "human" }),
  ],
  memory: [
    REACTION(150, 1200),
    r("activationTime", 150, 1500, 0.75, ["recall started the moment the preview ended", "bắt đầu nhớ lại ngay khi hết phần xem trước"], ["a pause before the first recalled item", "dừng trước món đầu tiên được nhớ lại"]),
    r("interClickMean", 100, 800, 1, ["recalled items follow each other very quickly", "các món nhớ lại nối nhau rất nhanh"], ["recalled items are spaced further apart", "các món nhớ lại cách nhau xa hơn"]),
    r("interClickCv", 0.03, 0.3, 1.25, ["recall actions arrive at almost exactly equal intervals", "các thao tác nhớ lại đến ở những khoảng gần như bằng nhau"], ["the gaps between recall actions differ", "khoảng cách giữa các thao tác nhớ lại khác nhau"]),
    r("corrections", 0, 2, 0.75, ["nothing was undone or deselected", "không hoàn tác hay bỏ chọn gì"], ["a choice was undone or deselected", "có lựa chọn bị hoàn tác hoặc bỏ chọn"], { oneSided: "human" }),
    r("wrongAttempts", 0, 2, 0.5, ["every recalled item was right when chosen", "mọi món nhớ lại đều đúng lúc chọn"], ["some recalled items were wrong when chosen", "có món nhớ lại sai lúc chọn"], { oneSided: "human" }),
  ],
  audio: [
    REACTION(150, 1200),
    r("interKeyCv", 0.03, 0.3, 1.5, ["keys are struck at almost exactly equal intervals", "các phím được gõ ở những khoảng gần như bằng nhau"], ["the gaps between keys differ", "khoảng cách giữa các phím khác nhau"]),
    r("corrections", 0, 1, 1, ["no character was deleted", "không xoá ký tự nào"], ["a character was deleted and retyped", "có ký tự bị xoá và gõ lại"], { oneSided: "human" }),
    r("pauseCount", 0, 1, 0.5, ["no long pause while typing", "không dừng lâu khi gõ"], ["a pause of over a second while typing", "có lúc dừng hơn một giây khi gõ"], { oneSided: "human" }),
  ],
  rotation: [
    r("angularSpeedCv", 0.1, 0.6, 1, ["angular speed barely changes", "tốc độ góc gần như không đổi"], ["angular speed varies a lot", "tốc độ góc thay đổi nhiều"]),
    SAMPLE_CV(),
    r("corrections", 0, 2, 1, ["no reversal of the turning direction", "không đảo chiều xoay lần nào"], ["the turning direction was reversed", "có đảo chiều xoay"], { oneSided: "human" }),
    r("finalAngularError", 0.5, 6, 0.75, ["ended almost exactly upright", "kết thúc gần như đúng thẳng đứng"], ["ended slightly away from exactly upright", "kết thúc hơi lệch khỏi thẳng đứng"]),
    REACTION(150, 900),
  ],
};
