import type { CheckboxFeatures } from "@captchalab/captcha-plugins";
import { EN, type Translate } from "@/lib/i18n";
import type { InspectMetric, NumericMetric } from "@/lib/inspect/metrics";

/**
 * Checkbox-specific selector over the generic MetricTable: which features to show and how to word
 * them. Unavailable values stay null/undefined and render as "—" (never a fake zero). There is no
 * trajectory or motion data here on purpose: one press has no meaningful path to chart.
 */
export function checkboxActivationMetrics(f: CheckboxFeatures, t: Translate = EN): NumericMetric[] {
  return [
    {
      id: "reactionTime",
      label: t("Thời gian phản ứng", "Reaction time"),
      value: f.reactionTime,
      unit: "ms",
      hint: t("đến lần nhấn đầu", "to first press"),
      description: t(
        "Thời gian từ lúc bắt đầu phiên đến lần nhấn đầu tiên vào ô (con trỏ nhấn xuống hoặc phím Space nhấn xuống).",
        "Time from the start of the session to the first press of the control (pointer down or Space down).",
      ),
    },
    {
      id: "timeToFirstActivation",
      label: t("Thời gian đến lần kích hoạt đầu", "Time to first activation"),
      value: f.timeToFirstActivation,
      unit: "ms",
      description: t(
        "Thời gian từ lúc bắt đầu phiên đến lần nhấn và thả hoàn tất đầu tiên.",
        "Time from the start of the session to the first completed press and release.",
      ),
    },
    {
      id: "pressDuration",
      label: t("Thời gian giữ", "Press duration"),
      value: f.pressDuration,
      unit: "ms",
      hint: t("lần kích hoạt cuối", "final activation"),
      description: t(
        "Thời gian giữ lần kích hoạt làm ô được đánh dấu, từ lúc nhấn đến lúc thả.",
        "How long the activation that left the box checked was held, from press to release.",
      ),
    },
    { id: "activationCount", label: t("Số lần kích hoạt", "Activation count"), value: f.activationCount, unit: "count" },
    {
      id: "successfulActivationIndex",
      label: t("Lần kích hoạt thành công", "Successful activation"),
      value: f.successfulActivationIndex,
      unit: "count",
      hint: t("thứ tự", "index"),
      description: t(
        "Lần kích hoạt thứ mấy (1 = lần đầu) làm ô được đánh dấu. Suy ra từ các sự kiện đã ghi.",
        "Which activation (1 = the first) left the box checked. Derived from the recorded events.",
      ),
    },
    {
      id: "interActivationTime",
      label: t("Thời gian giữa các lần kích hoạt", "Time between activations"),
      value: f.interActivationTime,
      unit: "ms",
      hint: t("trung bình", "mean"),
    },
  ];
}

export function checkboxSessionMetrics(f: CheckboxFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "completionTime", label: t("Thời lượng phiên", "Session duration"), value: f.completionTime, unit: "ms", hint: t("từ khi thử thách hiện ra", "since challenge shown") },
  ];
}
