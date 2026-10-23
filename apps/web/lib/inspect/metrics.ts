import type { BaseCaptchaFeatures, MotionFeatures } from "@captchalab/captcha-core";
import { EN, type Translate } from "@/lib/i18n";
import {
  NO_VALUE,
  formatAngularVelocity,
  formatDegrees,
  formatAcceleration,
  formatCount,
  formatMilliseconds,
  formatPixels,
  formatVelocity,
} from "@/lib/format";

export type MetricUnit = "ms" | "px" | "px/s" | "px/s²" | "deg" | "deg/s" | "count";

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
  deg: formatDegrees,
  "deg/s": formatAngularVelocity,
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
export function interactionMetrics(f: InteractionFeatures, t: Translate = EN): NumericMetric[] {
  return [
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    {
      id: "completionTime",
      label: t("Thời gian phiên", "Session time"),
      value: f.completionTime,
      unit: "ms",
      hint: t("từ lúc hiện thử thách", "since challenge shown"),
    },
    { id: "pointerDistance", label: t("Quãng đường con trỏ", "Pointer distance"), value: f.pointerDistance, unit: "px" },
    { id: "meanVelocity", label: t("Vận tốc trung bình", "Mean velocity"), value: f.meanVelocity, unit: "px/s" },
    { id: "maxVelocity", label: t("Vận tốc tối đa", "Max velocity"), value: f.maxVelocity, unit: "px/s" },
    { id: "directionChanges", label: t("Số lần đổi hướng", "Direction changes"), value: f.directionChanges, unit: "count" },
  ];
}
