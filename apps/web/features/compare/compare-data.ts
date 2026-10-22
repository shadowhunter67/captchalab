import type { SliderFeatures } from "@captchalab/captcha-plugins";
import { formatMetricValue, type NumericMetric } from "@/lib/inspect/metrics";

export interface CompareRow {
  id: string;
  label: string;
  description: string;
  left: string;
  right: string;
  /** right - left in the row's unit, formatted with a sign; null when either side is missing. */
  difference: string | null;
}

interface Dimension {
  id: string;
  label: string;
  description: string;
  unit: NumericMetric["unit"];
  pick: (f: SliderFeatures) => number | null;
}

/** The dimensions Compare shows. Descriptive only: no dimension is a verdict or a score. */
export const COMPARE_DIMENSIONS: readonly Dimension[] = [
  { id: "duration", label: "Duration", description: "Time from pointerdown to pointerup of the final drag.", unit: "ms", pick: (f) => f.dragDuration },
  { id: "distance", label: "Distance", description: "Total length of the pointer path.", unit: "px", pick: (f) => f.pointerDistance },
  { id: "meanVelocity", label: "Mean velocity", description: "Path length divided by movement time.", unit: "px/s", pick: (f) => f.meanVelocity },
  { id: "maxVelocity", label: "Max velocity", description: "Fastest segment of the path.", unit: "px/s", pick: (f) => f.maxVelocity },
  { id: "maxAcceleration", label: "Max acceleration", description: "Largest change of speed between consecutive segments.", unit: "px/s²", pick: (f) => f.maxAcceleration },
  { id: "directionChanges", label: "Direction changes", description: "Turns sharper than 45 degrees along the path.", unit: "count", pick: (f) => f.directionChanges },
  { id: "overshoot", label: "Overshoot", description: "Farthest the pointer went past the target, in px. It does not say whether a correction followed.", unit: "px", pick: (f) => f.overshoot },
];

const metric = (d: Dimension, value: number | null): NumericMetric => ({ id: d.id, label: d.label, value, unit: d.unit });

function signed(d: Dimension, delta: number): string {
  const text = formatMetricValue(metric(d, Math.abs(delta)));
  return `${delta < 0 ? "−" : delta > 0 ? "+" : "±"}${text}`;
}

/** Side-by-side rows. A missing side (no attempt yet) shows as a dash and has no difference. */
export function compareRows(left: SliderFeatures | null, right: SliderFeatures | null): CompareRow[] {
  return COMPARE_DIMENSIONS.map((d) => {
    const a = left ? d.pick(left) : null;
    const b = right ? d.pick(right) : null;
    const both = a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b);
    return {
      id: d.id,
      label: d.label,
      description: d.description,
      left: formatMetricValue(metric(d, a)),
      right: formatMetricValue(metric(d, b)),
      difference: both ? signed(d, b - a) : null,
    };
  });
}
