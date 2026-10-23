import type { SliderFeatures } from "@captchalab/captcha-plugins";
import { EN, type Translate } from "@/lib/i18n";
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
  labelVi: string;
  descriptionVi: string;
  unit: NumericMetric["unit"];
  pick: (f: SliderFeatures) => number | null;
}

/** The dimensions Compare shows. Descriptive only: no dimension is a verdict or a score. */
export const COMPARE_DIMENSIONS: readonly Dimension[] = [
  { id: "duration", label: "Duration", labelVi: "Thời lượng", description: "Time from pointerdown to pointerup of the final drag.", descriptionVi: "Thời gian từ lúc nhấn xuống đến lúc nhả ra của lần kéo cuối cùng.", unit: "ms", pick: (f) => f.dragDuration },
  { id: "distance", label: "Distance", labelVi: "Quãng đường", description: "Total length of the pointer path.", descriptionVi: "Tổng chiều dài đường đi của con trỏ.", unit: "px", pick: (f) => f.pointerDistance },
  { id: "meanVelocity", label: "Mean velocity", labelVi: "Vận tốc trung bình", description: "Path length divided by movement time.", descriptionVi: "Chiều dài đường đi chia cho thời gian di chuyển.", unit: "px/s", pick: (f) => f.meanVelocity },
  { id: "maxVelocity", label: "Max velocity", labelVi: "Vận tốc lớn nhất", description: "Fastest segment of the path.", descriptionVi: "Đoạn nhanh nhất của đường đi.", unit: "px/s", pick: (f) => f.maxVelocity },
  { id: "maxAcceleration", label: "Max acceleration", labelVi: "Gia tốc lớn nhất", description: "Largest change of speed between consecutive segments.", descriptionVi: "Mức thay đổi tốc độ lớn nhất giữa các đoạn liên tiếp.", unit: "px/s²", pick: (f) => f.maxAcceleration },
  { id: "directionChanges", label: "Direction changes", labelVi: "Số lần đổi hướng", description: "Turns sharper than 45 degrees along the path.", descriptionVi: "Các khúc rẽ gắt hơn 45 độ dọc theo đường đi.", unit: "count", pick: (f) => f.directionChanges },
  { id: "overshoot", label: "Overshoot", labelVi: "Vượt quá đích", description: "Farthest the pointer went past the target, in px. It does not say whether a correction followed.", descriptionVi: "Điểm con trỏ đi xa nhất quá đích, tính bằng px. Chỉ số này không cho biết sau đó có chỉnh lại hay không.", unit: "px", pick: (f) => f.overshoot },
];

const metric = (d: Dimension, value: number | null): NumericMetric => ({ id: d.id, label: d.label, value, unit: d.unit });

function signed(d: Dimension, delta: number): string {
  const text = formatMetricValue(metric(d, Math.abs(delta)));
  return `${delta < 0 ? "−" : delta > 0 ? "+" : "±"}${text}`;
}

/** Side-by-side rows. A missing side (no attempt yet) shows as a dash and has no difference. */
export function compareRows(left: SliderFeatures | null, right: SliderFeatures | null, t: Translate = EN): CompareRow[] {
  return COMPARE_DIMENSIONS.map((d) => {
    const a = left ? d.pick(left) : null;
    const b = right ? d.pick(right) : null;
    const both = a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b);
    return {
      id: d.id,
      label: t(d.labelVi, d.label),
      description: t(d.descriptionVi, d.description),
      left: formatMetricValue(metric(d, a)),
      right: formatMetricValue(metric(d, b)),
      difference: both ? signed(d, b - a) : null,
    };
  });
}
