import { EN, type Translate } from "@/lib/i18n";
import { SIGNALS_BY_CAPTCHA } from "./signal-catalog";
import type { BehavioralVector } from "./types";

export interface Observation {
  signal: string;
  en: string;
  vi: string;
}

interface Phrase {
  /** Smallest absolute difference worth mentioning, in the signal's unit. */
  minAbs: number;
  /** Smallest relative difference (|b - a| / max(|a|, |b|)) worth mentioning. */
  minRel: number;
  /** Synthetic value is LOWER / HIGHER than the human one. [en, vi] */
  lower: readonly [string, string];
  higher: readonly [string, string];
}

const ph = (minAbs: number, minRel: number, lower: readonly [string, string], higher: readonly [string, string]): Phrase => ({ minAbs, minRel, lower, higher });

/**
 * Descriptive sentences about THIS pair of samples. They compare two recordings; they never say how bots or
 * people behave in general, and none implies that one side is right.
 */
const PHRASES: Readonly<Record<string, Phrase>> = {
  speedCv: ph(0.1, 0.4, ["steadier speed", "tốc độ đều hơn"], ["more varied speed", "tốc độ thay đổi nhiều hơn"]),
  sampleIntervalCv: ph(0.05, 0.5, ["more uniform timing between pointer samples", "thời gian giữa các mẫu con trỏ đều hơn"], ["less uniform timing between pointer samples", "thời gian giữa các mẫu con trỏ kém đều hơn"]),
  interClickCv: ph(0.05, 0.5, ["more uniform timing between selections", "thời gian giữa các lần chọn đều hơn"], ["less uniform timing between selections", "thời gian giữa các lần chọn kém đều hơn"]),
  interKeyCv: ph(0.05, 0.5, ["a more uniform typing rhythm", "nhịp gõ đều hơn"], ["a less uniform typing rhythm", "nhịp gõ kém đều hơn"]),
  dragDurationCv: ph(0.05, 0.5, ["drag durations that are more alike", "thời lượng các lần kéo giống nhau hơn"], ["drag durations that differ more", "thời lượng các lần kéo khác nhau hơn"]),
  angularSpeedCv: ph(0.1, 0.4, ["steadier turning speed", "tốc độ xoay đều hơn"], ["more varied turning speed", "tốc độ xoay thay đổi nhiều hơn"]),
  directionChanges: ph(1, 0.4, ["fewer direction changes", "ít lần đổi hướng hơn"], ["more direction changes", "nhiều lần đổi hướng hơn"]),
  corrections: ph(1, 0.4, ["fewer corrections", "ít lần chỉnh lại hơn"], ["more corrections", "nhiều lần chỉnh lại hơn"]),
  overshoot: ph(2, 0.4, ["less overshoot", "vượt đích ít hơn"], ["more overshoot", "vượt đích nhiều hơn"]),
  releaseError: ph(2, 0.4, ["a smaller release error", "sai lệch khi thả nhỏ hơn"], ["a larger release error", "sai lệch khi thả lớn hơn"]),
  finalAngularError: ph(1, 0.4, ["a smaller final angular error", "sai lệch góc cuối nhỏ hơn"], ["a larger final angular error", "sai lệch góc cuối lớn hơn"]),
  straightness: ph(0.03, 0.04, ["a more curved path", "đường đi cong hơn"], ["a straighter path", "đường đi thẳng hơn"]),
  reactionTime: ph(150, 0.4, ["a shorter reaction time", "thời gian phản ứng ngắn hơn"], ["a longer reaction time", "thời gian phản ứng dài hơn"]),
  completionTime: ph(300, 0.4, ["a shorter completion time", "thời gian hoàn thành ngắn hơn"], ["a longer completion time", "thời gian hoàn thành dài hơn"]),
  pressDuration: ph(30, 0.4, ["a shorter press", "nhấn ngắn hơn"], ["a longer press", "nhấn lâu hơn"]),
  attemptCount: ph(1, 0.3, ["fewer attempts", "ít lần thử hơn"], ["more attempts", "nhiều lần thử hơn"]),
  failedDropCount: ph(1, 0.3, ["fewer failed drops", "ít lần thả hỏng hơn"], ["more failed drops", "nhiều lần thả hỏng hơn"]),
  interClickMean: ph(150, 0.4, ["less time between selections", "ít thời gian giữa các lần chọn hơn"], ["more time between selections", "nhiều thời gian giữa các lần chọn hơn"]),
  interKeyMean: ph(60, 0.4, ["less time between keys", "ít thời gian giữa các phím hơn"], ["more time between keys", "nhiều thời gian giữa các phím hơn"]),
};

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** Up to `limit` differences, largest relative difference first. Empty when nothing differs enough to mention. */
export function observations(human: BehavioralVector, synthetic: BehavioralVector, limit = 5): Observation[] {
  if (human.captchaId !== synthetic.captchaId) throw new RangeError("Observations compare the same CAPTCHA only");
  const out: (Observation & { score: number })[] = [];
  for (const id of SIGNALS_BY_CAPTCHA[human.captchaId]) {
    const phrase = PHRASES[id];
    const a = human.values[id];
    const b = synthetic.values[id];
    if (!phrase || !finite(a) || !finite(b)) continue;
    const abs = Math.abs(b - a);
    const rel = abs / Math.max(Math.abs(a), Math.abs(b), Number.EPSILON);
    if (abs < phrase.minAbs || rel < phrase.minRel) continue;
    const side = b < a ? phrase.lower : phrase.higher;
    out.push({
      signal: id,
      en: `This synthetic sample has ${side[0]} than this human sample.`,
      vi: `Mẫu mô phỏng này có ${side[1]} so với mẫu của người này.`,
      score: rel,
    });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, limit).map(({ signal, en, vi }) => ({ signal, en, vi }));
}

export const observationText = (o: Observation, t: Translate = EN): string => t(o.vi, o.en);
