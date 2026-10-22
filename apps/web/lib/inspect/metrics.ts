import type { BaseCaptchaFeatures, MotionFeatures } from "@captchalab/captcha-core";
import {
  NO_VALUE,
  formatAcceleration,
  formatCount,
  formatMilliseconds,
  formatPixels,
  formatVelocity,
} from "@/lib/format";

export type MetricUnit = "ms" | "px" | "px/s" | "px/s²" | "count";

interface MetricBase {
  id: string;
  label: string;
  /** Short qualifier shown next to the label, e.g. "along handle travel". */
  hint?: string;
  /** Longer explanation, exposed as a tooltip and to assistive tech. */
  description?: string;
}

/** A measured number. Raw value stays raw; formatting happens only on display. */
export interface NumericMetric extends MetricBase {
  /** null/undefined = not available for this interaction (shown as a dash, never as 0). */
  value: number | null | undefined;
  unit: MetricUnit;
  /** Overrides the unit formatter (e.g. for a percentage a later CAPTCHA needs). */
  format?: (value: number) => string;
}

/** A non-numeric feature (e.g. input modality) shown as-is. */
export interface TextMetric extends MetricBase {
  text: string;
}

/**
 * What the feature table renders. A CAPTCHA decides which features to show and how to label them;
 * the table knows nothing about the math.
 */
export type InspectMetric = NumericMetric | TextMetric;

const FORMATTERS: Record<MetricUnit, (v: number | null) => string> = {
  ms: formatMilliseconds,
  px: formatPixels,
  "px/s": formatVelocity,
  "px/s²": formatAcceleration,
  count: formatCount,
};

export function formatMetricValue(m: InspectMetric): string {
  if ("text" in m) return m.text;
  if (m.value === null || m.value === undefined || !Number.isFinite(m.value)) return NO_VALUE;
  return m.format ? m.format(m.value) : FORMATTERS[m.unit](m.value);
}

type InteractionFeatures = Partial<BaseCaptchaFeatures & MotionFeatures>;

/**
 * Generic whole-session summary any pointer-driven CAPTCHA can show. Missing features become
 * "not available" rows instead of being skipped or defaulted to 0.
 */
export function interactionMetrics(f: InteractionFeatures): NumericMetric[] {
  return [
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    {
      id: "completionTime",
      label: "Session time",
      value: f.completionTime,
      unit: "ms",
      hint: "since challenge shown",
    },
    { id: "pointerDistance", label: "Pointer distance", value: f.pointerDistance, unit: "px" },
    { id: "meanVelocity", label: "Mean velocity", value: f.meanVelocity, unit: "px/s" },
    { id: "maxVelocity", label: "Max velocity", value: f.maxVelocity, unit: "px/s" },
    { id: "directionChanges", label: "Direction changes", value: f.directionChanges, unit: "count" },
  ];
}
