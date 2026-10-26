import { generateSyntheticSample, profileDef, type SyntheticRequest } from "./synthetic";
import type { BehaviorCaptchaId } from "./types";

/** Number of generated runs in a reference distribution. */
export const DISTRIBUTION_RUNS = 30;

/** The signals charted per CAPTCHA: duration, a variation signal, corrections-like, and one more. */
export const DISTRIBUTION_SIGNALS: Readonly<Record<BehaviorCaptchaId, readonly string[]>> = {
  slider: ["completionTime", "speedCv", "corrections", "sampleIntervalCv"],
  "drag-drop": ["completionTime", "dragDurationCv", "directionChanges", "sampleIntervalCv"],
  checkbox: ["reactionTime", "pressDuration", "completionTime", "attemptCount"],
  "image-grid": ["completionTime", "interClickCv", "corrections", "interClickMean"],
  text: ["completionTime", "interKeyCv", "corrections", "interKeyMean"],
  rotation: ["completionTime", "angularSpeedCv", "corrections", "sampleIntervalCv"],
};

export interface SignalSummary {
  signal: string;
  /** Finite values, in run order. */
  values: number[];
  min: number | null;
  median: number | null;
  max: number | null;
}

export interface SyntheticDistribution {
  captchaId: BehaviorCaptchaId;
  profile: string;
  runs: number;
  baseSeed: number;
  /** False for profiles that never use their seed: every run is identical. */
  varies: boolean;
  signals: SignalSummary[];
}

export function summarize(signal: string, raw: readonly (number | null | undefined)[]): SignalSummary {
  const values = raw.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    signal,
    values,
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    median: sorted.length === 0 ? null : sorted.length % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2,
  };
}

/**
 * Runs the profile `runs` times with consecutive seeds on the SAME challenge. These are generated runs, so this
 * is a "generated synthetic reference distribution": it describes the generator, not people.
 */
export function syntheticDistribution(req: Omit<SyntheticRequest, "seed">, baseSeed: number, runs = DISTRIBUTION_RUNS): SyntheticDistribution {
  const samples = Array.from({ length: runs }, (_, i) => generateSyntheticSample({ ...req, seed: baseSeed + i }));
  return {
    captchaId: req.captchaId,
    profile: req.profile,
    runs,
    baseSeed,
    varies: profileDef(req.captchaId, req.profile)?.random ?? false,
    signals: DISTRIBUTION_SIGNALS[req.captchaId].map((id) => summarize(id, samples.map((s) => s.vector.values[id]))),
  };
}
