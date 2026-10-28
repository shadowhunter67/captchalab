import type { InputModality, InteractionSession, Point } from "@captchalab/captcha-core";
import type { DragDropLayout, SliderLayout } from "@captchalab/captcha-plugins";

/**
 * The CAPTCHAs the Behavioral Lab supports: the six of v0.5 first, then the five added in v0.7. Proof of Work is left
 * out on purpose: its measurements describe the device's computation, not an interaction.
 */
export const BEHAVIOR_CAPTCHAS = ["slider", "drag-drop", "checkbox", "image-grid", "text", "rotation", "shape-matching", "math-logic", "sequence", "memory", "audio"] as const;
/** The first six, whose classifier rules are frozen exactly as released in v0.5. */
export const V05_CAPTCHAS = ["slider", "drag-drop", "checkbox", "image-grid", "text", "rotation"] as const;
export type BehaviorCaptchaId = (typeof BEHAVIOR_CAPTCHAS)[number];

/** A CAPTCHA of the lab, or the neutral pointer task of the Invisible demo. */
export type LabTaskId = BehaviorCaptchaId | "invisible";

export function isBehaviorCaptcha(id: string | null | undefined): id is BehaviorCaptchaId {
  return (BEHAVIOR_CAPTCHAS as readonly string[]).includes(id ?? "");
}

/** The UI geometry some extractors need. Absent for the CAPTCHAs whose features come from events alone. */
/** Memory: when recall began on the session clock (null if it never did). */
export interface MemoryContext {
  recallStartMs: number | null;
}

export type BehaviorContext = SliderLayout | DragDropLayout | { center: Point } | MemoryContext | undefined;

export type SignalGroup = "timing" | "motion" | "correction" | "rhythm" | "attempts" | "input";
export const SIGNAL_GROUPS: readonly SignalGroup[] = ["timing", "motion", "correction", "rhythm", "attempts", "input"];

export type SignalUnit = "ms" | "px" | "px/s" | "px/s²" | "deg" | "deg/s" | "count" | "ratio";

/** Derived values only. No coordinates, no typed text, no answers. */
export type SignalValues = Readonly<Record<string, number | null>>;

/** Version of the signal set (ids, meanings, units). Bump when any definition changes. */
export const BEHAVIOR_FEATURE_SET = "behavior-signals@1";

export interface BehavioralVector {
  captchaId: LabTaskId;
  /** Which signal definitions the numbers follow. */
  featureSetVersion: typeof BEHAVIOR_FEATURE_SET;
  /** Plugin feature schema these were derived from, e.g. "slider@1". */
  sourceSchema: string;
  inputModality: InputModality;
  values: SignalValues;
}

export interface BehaviorSample {
  origin: "human" | "synthetic";
  captchaId: BehaviorCaptchaId;
  session: InteractionSession;
  context: BehaviorContext;
  vector: BehavioralVector;
  /** Synthetic samples only. */
  synthetic?: SyntheticMeta;
}

export interface SyntheticMeta {
  profile: string;
  /** Generator version, e.g. "synthetic@1". */
  generator: string;
  /** Seed that makes the profile reproducible. */
  seed: number;
}

export const SYNTHETIC_GENERATOR_VERSION = "synthetic@1";
