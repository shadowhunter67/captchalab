import { describe, expect, it } from "vitest";
import type { PowFeatures } from "@captchalab/captcha-plugins";
import { formatMetricValue, type InspectMetric } from "@/lib/inspect/metrics";
import { powMetrics, powStatusText } from "../pow-view-data";

const base = {
  reactionTime: 120,
  startCount: 1,
  cancelCount: 0,
  attemptCount: 1,
  computationTime: 42.4,
  iterations: 12345,
  iterationsPerSecond: 291_000.4,
  nonce: 12344,
  hashPrefix: "00ab12cd34ef",
  inputModality: "mouse",
  eventCount: 6,
} as unknown as PowFeatures;

const byId = (ms: InspectMetric[], id: string): InspectMetric => ms.find((m) => m.id === id)!;

describe("powMetrics", () => {
  it("has exactly the expected ids in order", () => {
    expect(powMetrics(base).map((m) => m.id)).toEqual([
      "computationTime", "iterations", "iterationsPerSecond", "nonce", "hashPrefix", "startCount", "cancelCount", "attemptCount", "eventCount", "inputModality",
    ]);
  });
  it("formats numbers with separators and keeps the nonce plain", () => {
    const ms = powMetrics(base);
    expect(formatMetricValue(byId(ms, "iterations"))).toBe("12,345");
    expect(formatMetricValue(byId(ms, "nonce"))).toBe("12344");
    expect(formatMetricValue(byId(ms, "iterationsPerSecond"))).toBe("291,000 /s");
    expect(formatMetricValue(byId(ms, "computationTime"))).toMatch(/ms$/);
    expect(formatMetricValue(byId(ms, "hashPrefix"))).toBe("00ab12cd34ef");
  });
  it("shows a dash for missing values, never 0", () => {
    const ms = powMetrics({ ...base, computationTime: null, iterations: null, iterationsPerSecond: null, nonce: null, hashPrefix: null });
    for (const id of ["computationTime", "iterations", "iterationsPerSecond", "nonce", "hashPrefix"]) expect(formatMetricValue(byId(ms, id))).toBe("—");
  });
  it("keeps a real zero", () => {
    expect(formatMetricValue(byId(powMetrics(base), "cancelCount"))).toBe("0");
  });
  it("translates labels", () => {
    expect(byId(powMetrics(base, (vi) => vi), "iterations").label).toBe("Số lần băm");
    expect(byId(powMetrics(base), "iterations").label).toBe("Hashes tried");
  });
});

describe("powStatusText", () => {
  it("covers every state in English and Vietnamese", () => {
    expect(powStatusText("idle")).toBe("Not started");
    expect(powStatusText("running")).toBe("Computing…");
    expect(powStatusText("done")).toBe("Nonce found");
    expect(powStatusText("cancelled")).toBe("Cancelled");
    expect(powStatusText("cancelled", (vi) => vi)).toBe("Đã huỷ");
  });
});
