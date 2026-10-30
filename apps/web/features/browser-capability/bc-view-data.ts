import type { BcCheckId, BcFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

export function checkLabel(id: BcCheckId, t: Translate = EN): string {
  switch (id) {
    case "javascript":
      return t("JavaScript", "JavaScript");
    case "compute":
      return t("Phép tính nhỏ cục bộ", "Small local computation");
    case "webcrypto":
      return t("Web Crypto API", "Web Crypto API");
    case "canvas":
      return t("Canvas API", "Canvas API");
    case "worker":
      return t("Web Worker", "Web Workers");
    case "webaudio":
      return t("Web Audio API", "Web Audio API");
    case "pointer":
      return t("Pointer Events", "Pointer Events");
  }
}

/** Computation metrics for the generic MetricTable. Null shows as a dash, never as 0. */
export function bcMetrics(f: BcFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "checkCount", label: t("Số kiểm tra được hỏi", "Checks asked"), value: f.checkCount, unit: "count" },
    { id: "supportedCount", label: t("Số kiểm tra có", "Checks available"), value: f.supportedCount, unit: "count" },
    { id: "probeTime", label: t("Thời gian kiểm tra", "Check time"), value: f.probeTime, unit: "ms" },
    { id: "computeTime", label: t("Thời gian phép tính nhỏ", "Computation time"), value: f.computeTime, unit: "ms" },
    { id: "attemptCount", label: t("Số lần chạy", "Runs"), value: f.attemptCount, unit: "count" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
