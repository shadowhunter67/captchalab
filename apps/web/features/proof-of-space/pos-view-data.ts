import type { PosFeatures } from "@captchalab/captcha-plugins";
import type { InspectMetric } from "@/lib/inspect/metrics";
import { EN, type Translate } from "@/lib/i18n";

export type PosStatus = "idle" | "running" | "done" | "cancelled" | "error";

export function posStatusText(status: PosStatus, t: Translate = EN): string {
  switch (status) {
    case "idle":
      return t("Chưa bắt đầu", "Not started");
    case "running":
      return t("Đang điền bộ nhớ…", "Filling memory…");
    case "done":
      return t("Đã tạo bằng chứng", "Proof made");
    case "cancelled":
      return t("Đã huỷ", "Cancelled");
    case "error":
      return t("Không cấp phát được bộ nhớ", "Could not allocate the memory");
  }
}

export const formatBytes = (n: number): string => (n >= 1048576 ? `${(n / 1048576).toFixed(n % 1048576 === 0 ? 0 : 2)} MB` : `${Math.round(n / 1024)} KB`);
const formatBig = (v: number): string => Math.round(v).toLocaleString("en-US");

/** Computation metrics for the generic MetricTable. Null shows as a dash, never as 0. */
export function posMetrics(f: PosFeatures, t: Translate = EN): InspectMetric[] {
  return [
    { id: "allocatedBytes", label: t("Bộ nhớ đã cấp phát", "Allocated bytes"), value: f.allocatedBytes, unit: "count", format: formatBytes },
    { id: "fillTime", label: t("Thời gian điền", "Fill time"), value: f.fillTime, unit: "ms" },
    { id: "verificationTime", label: t("Thời gian xác minh", "Verification time"), value: f.verificationTime, unit: "ms", hint: t("do trang đo", "measured by the page") },
    { id: "totalTime", label: t("Tổng thời gian", "Total time"), value: f.totalTime, unit: "ms", hint: t("điền + đọc + xác minh", "fill + read + verify") },
    { id: "operations", label: t("Số thao tác", "Operations"), value: f.operations, unit: "count", format: formatBig, description: t("Số byte ghi cộng số byte đọc để lập bằng chứng.", "Bytes written plus bytes read to build the proof.") },
    { id: "attemptCount", label: t("Số lần thử", "Attempts"), value: f.attemptCount, unit: "count" },
    { id: "cancelCount", label: t("Số lần bấm Huỷ", "Cancel presses"), value: f.cancelCount, unit: "count" },
    { id: "eventCount", label: t("Số sự kiện", "Event count"), value: f.eventCount, unit: "count" },
    { id: "inputModality", label: t("Cách nhập", "Input modality"), text: f.inputModality },
  ];
}
