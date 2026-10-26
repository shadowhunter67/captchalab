import type { PowFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

export type PowStatus = "idle" | "running" | "done" | "cancelled";

/** Short status line for the page. */
export function powStatusText(status: PowStatus, t: Translate = EN): string {
  switch (status) {
    case "idle":
      return t("Chưa bắt đầu", "Not started");
    case "running":
      return t("Đang tính…", "Computing…");
    case "done":
      return t("Đã tìm thấy nonce", "Nonce found");
    case "cancelled":
      return t("Đã huỷ", "Cancelled");
  }
}

const formatBig = (v: number): string => Math.round(v).toLocaleString("en-US");
const formatRate = (v: number): string => `${formatBig(v)} /s`;

/** Computation metrics shown by the generic MetricTable. Null shows as a dash, never as 0. */
export function powMetrics(f: PowFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "computationTime", label: t("Thời gian tính", "Computation time"), value: f.computationTime, unit: "ms", hint: t("của lần chạy thành công", "of the successful run") },
    { id: "iterations", label: t("Số lần băm", "Hashes tried"), value: f.iterations, unit: "count", format: formatBig },
    { id: "iterationsPerSecond", label: t("Lần băm mỗi giây", "Hashes per second"), value: f.iterationsPerSecond, unit: "count", format: formatRate, description: t("Phụ thuộc thiết bị và trình duyệt.", "Depends on the device and browser.") },
    { id: "nonce", label: "Nonce", value: f.nonce, unit: "count", format: String },
    { id: "hashPrefix", label: t("Đầu của mã băm", "Hash prefix"), text: f.hashPrefix ?? "—", hint: t("12 ký tự hex đầu", "first 12 hex characters") },
    { id: "startCount", label: t("Số lần bấm Bắt đầu", "Start presses"), value: f.startCount, unit: "count" },
    { id: "cancelCount", label: t("Số lần bấm Huỷ", "Cancel presses"), value: f.cancelCount, unit: "count" },
    { id: "attemptCount", label: t("Số lần thử", "Attempts"), value: f.attemptCount, unit: "count" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
