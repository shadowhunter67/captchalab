import type { ImageGridFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";

/** Toggle a cell id in an ordered selection (returns a new array). */
export function toggleCell(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

/** Next focus index for an arrow key on a size x size grid; null for other keys. Stops at the edges. */
export function moveFocus(index: number, key: string, size: number): number | null {
  const row = Math.floor(index / size);
  const col = index % size;
  switch (key) {
    case "ArrowLeft": return col > 0 ? index - 1 : index;
    case "ArrowRight": return col < size - 1 ? index + 1 : index;
    case "ArrowUp": return row > 0 ? index - size : index;
    case "ArrowDown": return row < size - 1 ? index + size : index;
    case "Home": return row * size;
    case "End": return row * size + size - 1;
    default: return null;
  }
}

/** Metrics shown by the generic MetricTable for the image grid. Null shows as a dash. */
export function imageGridMetrics(f: ImageGridFeatures): InspectMetric[] {
  return [
    { id: "reactionTime", label: "Reaction time", value: f.reactionTime, unit: "ms", hint: "to first press" },
    { id: "timeToFirstSelection", label: "Time to first selection", value: f.timeToFirstSelection, unit: "ms" },
    { id: "completionTime", label: "Completion time", value: f.completionTime, unit: "ms", hint: "session so far" },
    { id: "selectionCount", label: "Selected images", value: f.selectionCount, unit: "count" },
    { id: "correctionCount", label: "Deselections", value: f.correctionCount, unit: "count", description: "Toggles that removed a selection." },
    { id: "interClickTimeMean", label: "Mean time between toggles", value: f.interClickTimeMean, unit: "ms" },
    { id: "attemptCount", label: "Selection rounds", value: f.attemptCount, unit: "count", description: "Runs of toggles separated by more than 5 s." },
    { id: "eventCount", label: "Event count", value: f.eventCount, unit: "count" },
    { id: "inputModality", label: "Input modality", text: f.inputModality },
  ];
}
