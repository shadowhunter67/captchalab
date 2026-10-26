import { describe, expect, it } from "vitest";
import type { ShapeMatchingFeatures } from "@captchalab/captcha-plugins";
import { pairNumbers, shapeMatchingMetrics, sourceLabel, statusText, targetLabel } from "../shape-matching-view-data";

describe("pairNumbers", () => {
  it("numbers both ends of each pair in match order", () => {
    const n = pairNumbers({ selected: null, matches: { s2: "t1", s1: "t3" } });
    expect(n.bySource).toEqual({ s2: 1, s1: 2 });
    expect(n.byTarget).toEqual({ t1: 1, t3: 2 });
  });
  it("is empty without matches", () => {
    expect(pairNumbers({ selected: "s1", matches: {} })).toEqual({ bySource: {}, byTarget: {} });
  });
});

describe("labels", () => {
  it("names unmatched and matched sources", () => {
    expect(sourceLabel(1, 4, "star", null)).toBe("Source 2 of 4: star");
    expect(sourceLabel(1, 4, "star", 2)).toBe("Source 2 of 4: star, matched to target 3");
  });
  it("names unmatched and matched targets", () => {
    expect(targetLabel(2, 4, "star", null)).toBe("Target 3 of 4: star");
    expect(targetLabel(2, 4, "star", 1)).toBe("Target 3 of 4: star, matched to source 2");
  });
  it("uses the translator", () => {
    expect(sourceLabel(0, 3, "x", 0, (vi) => vi)).toContain("đã ghép với đích 1");
  });
});

describe("statusText", () => {
  it("reports the count and a pending selection", () => {
    expect(statusText({ selected: null, matches: { a: "b" } }, 4)).toBe("1 of 4 shapes matched");
    expect(statusText({ selected: "a", matches: {} }, 4)).toBe("Source selected: pick its target. 0 of 4 shapes matched");
  });
});

describe("shapeMatchingMetrics", () => {
  const base = {
    reactionTime: null,
    timeToFirstMatch: null,
    completionTime: 5,
    selectionCount: 0,
    matchAttempts: 0,
    correctMatchCount: 0,
    incorrectMatchCount: 0,
    correctionCount: 0,
    interActionTimeMean: null,
    eventCount: 0,
    inputModality: "mouse",
  } as unknown as ShapeMatchingFeatures;
  it("lists the documented ids in order and keeps nulls", () => {
    const m = shapeMatchingMetrics(base);
    expect(m.map((x) => x.id)).toEqual([
      "reactionTime",
      "timeToFirstMatch",
      "completionTime",
      "selectionCount",
      "matchAttempts",
      "correctMatchCount",
      "incorrectMatchCount",
      "correctionCount",
      "interActionTimeMean",
      "eventCount",
      "inputModality",
    ]);
    expect(m.find((x) => x.id === "reactionTime")).toMatchObject({ value: null });
  });
});
