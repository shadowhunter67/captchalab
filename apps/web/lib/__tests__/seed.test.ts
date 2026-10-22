import { describe, expect, it } from "vitest";
import { parseSeed, randomSeed } from "../seed";

describe("seed helpers", () => {
  it("parses a numeric seed from the query string", () => {
    expect(parseSeed("?seed=12345")).toBe(12345);
    expect(parseSeed("?a=1&seed=0")).toBe(0);
    expect(parseSeed("seed=7")).toBe(7);
  });

  it("rejects missing, non-numeric, signed and oversized seeds", () => {
    for (const bad of ["", "?x=1", "?seed=", "?seed=abc", "?seed=-1", "?seed=1.5", "?seed=12345678901", "?seed=1e3"]) {
      expect(parseSeed(bad)).toBeNull();
    }
  });

  it("wraps seeds above 2^32 into the unsigned 32-bit range", () => {
    expect(parseSeed("?seed=4294967296")).toBe(0);
  });

  it("randomSeed returns an unsigned 32-bit integer", () => {
    const s = randomSeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
