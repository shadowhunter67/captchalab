import { describe, expect, it } from "vitest";
import { DIFFICULTIES, assertRange, isDifficulty, resolveVariant, supportedDifficulties, type CaptchaVariantSet } from "../index";

const set: CaptchaVariantSet<{ size: number }> = {
  variants: [
    { id: "a", name: "A", description: "", difficulties: { easy: { size: 1 }, medium: { size: 2 }, hard: { size: 3 } } },
    { id: "only-medium", name: "B", description: "", difficulties: { medium: { size: 9 } } },
  ],
  defaultSelection: { variantId: "a", difficulty: "medium" },
};

describe("variants", () => {
  it("resolves the default, a named variant and a level", () => {
    expect(resolveVariant(set).config).toEqual({ size: 2 });
    expect(resolveVariant(set, { variantId: "a", difficulty: "hard" }).config).toEqual({ size: 3 });
    expect(resolveVariant(set, { difficulty: "easy" }).challengeConfig).toEqual({ variantId: "a", difficulty: "easy", parameters: { size: 1 } });
  });
  it("a named variant without a level uses medium", () => {
    expect(resolveVariant(set, { variantId: "only-medium" }).config).toEqual({ size: 9 });
  });
  it("rejects unknown variants and unsupported levels", () => {
    expect(() => resolveVariant(set, { variantId: "nope" })).toThrow(RangeError);
    expect(() => resolveVariant(set, { variantId: "only-medium", difficulty: "hard" })).toThrow(RangeError);
  });
  it("lists supported difficulties in order", () => {
    expect(supportedDifficulties(set.variants[0]!)).toEqual([...DIFFICULTIES]);
    expect(supportedDifficulties(set.variants[1]!)).toEqual(["medium"]);
  });
  it("type guard and range check", () => {
    expect(isDifficulty("hard")).toBe(true);
    expect(isDifficulty("extreme")).toBe(false);
    expect(() => assertRange("x", 5, 0, 4)).toThrow(RangeError);
    expect(() => assertRange("x", Number.NaN, 0, 4)).toThrow(RangeError);
    expect(() => assertRange("x", 4, 0, 4)).not.toThrow();
  });
});
