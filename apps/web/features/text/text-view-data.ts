import type { TextFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** Metrics shown by the generic MetricTable for the text CAPTCHA. Null shows as a dash. */
export function textMetrics(f: TextFeatures): InspectMetric[] {
  return [
    { id: "reactionTime", label: "Reaction time", value: f.reactionTime, unit: "ms", hint: "to first key" },
    { id: "timeToFirstKey", label: "Time to first character", value: f.timeToFirstKey, unit: "ms" },
    { id: "completionTime", label: "Completion time", value: f.completionTime, unit: "ms", hint: "session so far" },
    { id: "keyCount", label: "Character keys", value: f.keyCount, unit: "count" },
    { id: "backspaceCount", label: "Backspace / Delete", value: f.backspaceCount, unit: "count" },
    { id: "correctionCount", label: "Corrections", value: f.correctionCount, unit: "count", description: "Deletes after something was typed." },
    { id: "interKeyTimeMean", label: "Mean time between characters", value: f.interKeyTimeMean, unit: "ms" },
    { id: "attemptCount", label: "Typing bursts", value: f.attemptCount, unit: "count", description: "Runs of key presses separated by more than 5 s." },
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    { id: "inputModality", label: "Input modality", text: f.inputModality },
  ];
}
