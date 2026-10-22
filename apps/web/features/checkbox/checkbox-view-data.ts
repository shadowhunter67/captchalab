import type { CheckboxFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric, NumericMetric } from "@/lib/inspect/metrics";

/**
 * Checkbox-specific selector over the generic MetricTable: which features to show and how to word
 * them. Unavailable values stay null/undefined and render as "—" (never a fake zero). There is no
 * trajectory or motion data here on purpose: one press has no meaningful path to chart.
 */
export function checkboxActivationMetrics(f: CheckboxFeatures): NumericMetric[] {
  return [
    {
      id: "reactionTime",
      label: "Reaction time",
      value: f.reactionTime,
      unit: "ms",
      hint: "to first press",
      description: "Time from the start of the session to the first press of the control (pointer down or Space down).",
    },
    {
      id: "timeToFirstActivation",
      label: "Time to first activation",
      value: f.timeToFirstActivation,
      unit: "ms",
      description: "Time from the start of the session to the first completed press and release.",
    },
    {
      id: "pressDuration",
      label: "Press duration",
      value: f.pressDuration,
      unit: "ms",
      hint: "final activation",
      description: "How long the activation that left the box checked was held, from press to release.",
    },
    { id: "activationCount", label: "Activation count", value: f.activationCount, unit: "count" },
    {
      id: "successfulActivationIndex",
      label: "Successful activation",
      value: f.successfulActivationIndex,
      unit: "count",
      hint: "index",
      description: "Which activation (1 = the first) left the box checked. Derived from the recorded events.",
    },
    {
      id: "interActivationTime",
      label: "Time between activations",
      value: f.interActivationTime,
      unit: "ms",
      hint: "mean",
    },
  ];
}

export function checkboxSessionMetrics(f: CheckboxFeatures): InspectMetric[] {
  return [
    { id: "inputModality", label: "Input modality", text: f.inputModality },
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    { id: "completionTime", label: "Session duration", value: f.completionTime, unit: "ms", hint: "since challenge shown" },
  ];
}
