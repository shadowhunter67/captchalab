import { describe, expect, it } from "vitest";
import type { SequenceFeatures } from "@captchalab/captcha-plugins";
import { NO_OPTION_ID, numberAnswer, optionAnswer, optionLabel, sequenceMetrics, spokenNumberSequence, spokenShapeSequence, toggleOption } from "../sequence-view-data";

const features = { reactionTime: 100, timeToFirstKey: 120, keyCount: 2, backspaceCount: 0, timeToFirstSelection: null, selectionCount: null, correctionCount: 0, interActionTimeMean: null, attemptCount: 1, completionTime: 900, eventCount: 6, inputModality: "keyboard" } as unknown as SequenceFeatures;
const ids = (kind: "number" | "visual") => sequenceMetrics(features, kind).map((m) => m.id);

describe("sequenceMetrics", () => {
  it("number: key rows, no selection rows", () => {
    expect(ids("number")).toEqual(["reactionTime", "timeToFirstKey", "completionTime", "keyCount", "backspaceCount", "correctionCount", "interActionTimeMean", "attemptCount", "eventCount", "inputModality"]);
  });
  it("visual: selection rows, no key rows", () => {
    expect(ids("visual")).toEqual(["reactionTime", "timeToFirstSelection", "completionTime", "selectionCount", "correctionCount", "interActionTimeMean", "attemptCount", "eventCount", "inputModality"]);
  });
  it("has Vietnamese labels", () => {
    const vi = sequenceMetrics(features, "number", (v) => v);
    expect(vi.find((m) => m.id === "reactionTime")?.label).toBe("Thời gian phản ứng");
  });
});

describe("spoken sequences", () => {
  it("names the hidden number term", () => {
    expect(spokenNumberSequence([2, 4, 6, null, 10])).toBe("2, 4, 6, missing, 10");
    expect(spokenNumberSequence([2, null], (v) => v)).toBe("2, còn thiếu");
  });
  it("names shapes and the hidden cell", () => {
    expect(spokenShapeSequence(["star", null, "circle"])).toBe("star, missing, circle");
  });
});

describe("optionLabel", () => {
  it("names the shape", () => {
    expect(optionLabel(1, 4, "star")).toBe("Option 2 of 4: star");
    expect(optionLabel(0, 3, "circle", (v) => v)).toBe("Lựa chọn 1 trên 3: hình tròn");
  });
});

describe("toggleOption", () => {
  it("replaces or clears", () => {
    expect(toggleOption(null, "a")).toBe("a");
    expect(toggleOption("a", "b")).toBe("b");
    expect(toggleOption("a", "a")).toBeNull();
  });
});

describe("answers", () => {
  it("number: whole numbers parse", () => {
    expect(numberAnswer("12")).toEqual({ kind: "number", value: 12 });
    expect(numberAnswer("-3")).toEqual({ kind: "number", value: -3 });
  });
  it("number: garbage becomes NaN", () => {
    const a = numberAnswer("12abc");
    expect(a.kind === "number" && Number.isNaN(a.value)).toBe(true);
  });
  it("option: nothing chosen uses an unknown id", () => {
    expect(optionAnswer("o2")).toEqual({ kind: "option", optionId: "o2" });
    expect(optionAnswer(null)).toEqual({ kind: "option", optionId: NO_OPTION_ID });
  });
});
