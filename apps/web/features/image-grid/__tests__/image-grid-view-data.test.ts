import { describe, expect, it } from "vitest";
import type { ImageGridFeatures } from "@captchalab/captcha-plugins";
import { imageGridMetrics, moveFocus, toggleCell } from "../image-grid-view-data";

describe("toggleCell", () => {
  it("adds then removes without mutating", () => {
    const a = ["c1"];
    expect(toggleCell(a, "c2")).toEqual(["c1", "c2"]);
    expect(toggleCell(["c1", "c2"], "c1")).toEqual(["c2"]);
    expect(a).toEqual(["c1"]);
  });
});

describe("moveFocus", () => {
  it("moves within the grid and stops at edges", () => {
    expect(moveFocus(4, "ArrowLeft", 3)).toBe(3);
    expect(moveFocus(4, "ArrowRight", 3)).toBe(5);
    expect(moveFocus(4, "ArrowUp", 3)).toBe(1);
    expect(moveFocus(4, "ArrowDown", 3)).toBe(7);
    expect(moveFocus(0, "ArrowLeft", 3)).toBe(0);
    expect(moveFocus(2, "ArrowRight", 3)).toBe(2);
    expect(moveFocus(1, "ArrowUp", 3)).toBe(1);
    expect(moveFocus(7, "ArrowDown", 3)).toBe(7);
    expect(moveFocus(4, "Home", 3)).toBe(3);
    expect(moveFocus(4, "End", 3)).toBe(5);
  });
  it("ignores other keys", () => {
    expect(moveFocus(4, "a", 3)).toBeNull();
  });
});

describe("imageGridMetrics", () => {
  it("lists the metric ids", () => {
    const f = {
      completionTime: 1, eventCount: 0, inputModality: "none", reactionTime: null, timeToFirstSelection: null,
      selectionCount: 0, correctionCount: 0, interClickTimeMean: null, attemptCount: 0,
    } as unknown as ImageGridFeatures;
    expect(imageGridMetrics(f).map((x) => x.id)).toContain("timeToFirstSelection");
  });
});
