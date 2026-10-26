import { describe, expect, it } from "vitest";
import { createRng } from "@captchalab/captcha-core";
import { registry, type MemoryFeatures } from "@captchalab/captcha-plugins";
import { cellIds, cellLabel, isLitCell, memoryMetrics, nextPhase, optionLabel, optionShape, previewItems, previewSeconds, previewStatus, slotLabel } from "../memory-view-data";

const features = {
  reactionTime: 100,
  recallDuration: null,
  timeToFirstSelection: null,
  completionTime: 900,
  selectionCount: 0,
  correctSelections: 0,
  incorrectSelections: 0,
  correctionCount: 0,
  eventCount: 4,
  inputModality: "mouse",
} as unknown as MemoryFeatures;

const gen = (variantId: string, seed = 5) => registry.get("memory").generate({ rng: createRng(seed), variantId, difficulty: "easy" });

describe("memoryMetrics", () => {
  it("lists the feature ids in order", () => {
    expect(memoryMetrics(features).map((m) => m.id)).toEqual([
      "reactionTime",
      "recallDuration",
      "timeToFirstSelection",
      "completionTime",
      "selectionCount",
      "correctSelections",
      "incorrectSelections",
      "correctionCount",
      "eventCount",
      "inputModality",
    ]);
  });
  it("keeps null as null (shown as a dash, never 0)", () => {
    const m = memoryMetrics(features);
    expect("value" in m[1]! && m[1].value).toBeNull();
  });
  it("has Vietnamese labels", () => {
    expect(memoryMetrics(features, (v) => v)[0]?.label).toBe("Thời gian phản ứng");
  });
});

describe("nextPhase", () => {
  it("moves ready -> preview -> recall", () => {
    expect(nextPhase("ready", "start")).toBe("preview");
    expect(nextPhase("preview", "timeout")).toBe("recall");
  });
  it("ignores a second Start and a stale timeout", () => {
    expect(nextPhase("preview", "start")).toBe("preview");
    expect(nextPhase("recall", "start")).toBe("recall");
    expect(nextPhase("ready", "timeout")).toBe("ready");
    expect(nextPhase("recall", "timeout")).toBe("recall");
  });
  it("reset returns to ready", () => {
    expect(nextPhase("recall", "reset")).toBe("ready");
  });
});

describe("previewSeconds / previewStatus", () => {
  it("rounds up and is at least 1", () => {
    expect(previewSeconds(3000)).toBe(3);
    expect(previewSeconds(3500)).toBe(4);
    expect(previewSeconds(100)).toBe(1);
  });
  it("mentions the time, in both languages", () => {
    expect(previewStatus(4000, "sequence")).toContain("4 s");
    expect(previewStatus(3000, "position", (vi) => vi)).toContain("3 giây");
  });
});

describe("labels", () => {
  it("option, slot and cell labels", () => {
    expect(optionLabel(0, 5, "star", false)).toBe("Option 1 of 5: star");
    expect(optionLabel(1, 5, "circle", true, (vi) => vi)).toBe("Lựa chọn 2 trên 5: hình tròn (đã chọn)");
    expect(slotLabel(1, 3, null)).toBe("Slot 1 of 3: empty");
    expect(slotLabel(2, 3, "square")).toBe("Slot 2 of 3: square");
    expect(cellLabel("c5", 3)).toBe("Cell row 2, column 2");
    expect(cellLabel("c9", 3, (vi) => vi)).toBe("Ô hàng 3, cột 3");
  });
});

describe("challenge helpers", () => {
  it("previewItems numbers the sequence from 1 in shown order", () => {
    const c = gen("sequence");
    const items = previewItems(c);
    expect(items.map((i) => i.n)).toEqual([1, 2, 3]);
    if (c.kind === "sequence") expect(items.map((i) => i.optionId)).toEqual([...c.sequence]);
    expect(optionShape(c, items[0]!.optionId)).toBe(items[0]!.shape);
  });
  it("position: no preview items, lit cells are exactly the targets", () => {
    const c = gen("position");
    expect(previewItems(c)).toEqual([]);
    expect(cellIds(3)).toHaveLength(9);
    if (c.kind === "position") {
      const lit = cellIds(c.size).filter((id) => isLitCell(c, id));
      expect(lit).toEqual([...c.targets]);
    }
    expect(optionShape(c, "c1")).toBeNull();
  });
});
