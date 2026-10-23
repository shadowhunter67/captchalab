import { describe, expect, it } from "vitest";
import { EN } from "@/lib/i18n";
import { translateReason } from "../reasons";

const VI = (vi: string, _en: string): string => vi;

// Every `reason` literal found in packages/captcha-plugins/src/*/verifier.ts.
const VERIFIER_REASONS = [
  "The challenge is missing or malformed.",
  "The answer must state whether the box is checked.",
  "The checkbox was left checked, as the challenge requires.",
  "The checkbox was left unchecked.",
  "The challenge or answer could not be read.",
  "The challenge is malformed (items).",
  "The challenge is malformed (targets).",
  "The challenge is malformed (target mapping).",
  "The challenge is malformed (every item needs one target).",
  "The answer must state where each item was placed.",
  "The answer mentions an item that is not in this challenge.",
  "The answer is missing an item.",
  "The answer uses an unknown drop target.",
  "Two items cannot rest on the same drop target.",
  "Every item is on its matching target.",
  "Some items are not on a target yet.",
  "Some items are on the wrong target.",
  "The answer must be a list of cell ids.",
  "The answer mentions a cell that is not in this grid.",
  "Every matching image is selected and nothing else.",
  "Some matching images are missing and some selected images do not match.",
  "Some matching images are not selected.",
  "Some selected images do not match.",
  "The answer must be a finite angle in degrees.",
  "The object is upright within the accepted tolerance.",
  "The object is not upright enough yet.",
  "The challenge is malformed (target and tolerance must be finite numbers in [0, 1]).",
  "Answer position must be a finite number between 0 and 1.",
  "The handle was released within the accepted tolerance of the target.",
  "The handle was released outside the accepted tolerance of the target.",
  "The answer must be text.",
  "The text matches (case does not matter).",
  "The text does not match.",
];

describe("translateReason", () => {
  it.each(VERIFIER_REASONS)("translates: %s", (reason) => {
    expect(translateReason(reason, EN)).toBe(reason);
    const vi = translateReason(reason, VI);
    expect(vi).not.toBe(reason);
    expect(vi.length).toBeGreaterThan(0);
  });

  it("keeps unknown reasons unchanged", () => {
    expect(translateReason("Something else.", VI)).toBe("Something else.");
  });
});
