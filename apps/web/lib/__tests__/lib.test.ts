import { describe, expect, it } from "vitest";
import { formatCount, formatMilliseconds, formatPixels, formatVelocity } from "../format";
import { toPointerSample, toRecorderEvent } from "../pointer-adapter";

describe("format", () => {
  it("formats units and null/NaN", () => {
    expect(formatMilliseconds(412.4)).toBe("412 ms");
    expect(formatMilliseconds(1280)).toBe("1.28 s");
    expect(formatPixels(2.44)).toBe("2.4 px");
    expect(formatVelocity(247.6)).toBe("248 px/s");
    expect(formatCount(3)).toBe("3");
    for (const f of [formatMilliseconds, formatPixels, formatVelocity, formatCount]) {
      expect(f(null)).toBe("—");
      expect(f(Number.NaN)).toBe("—");
    }
  });
});

describe("pointer adapter", () => {
  const base = { clientX: 150, clientY: 60, pointerId: 3, pointerType: "touch", pressure: 0.5 };

  it("converts client coordinates to surface-relative ones", () => {
    expect(toPointerSample(base, { left: 100, top: 40 })).toEqual({
      x: 50, y: 20, pointerId: 3, pointerType: "touch", pressure: 0.5,
    });
  });

  it("rejects non-finite coordinates / ids and unknown pointer types", () => {
    expect(toPointerSample({ ...base, clientX: Number.NaN }, { left: 0, top: 0 })).toBeNull();
    expect(toPointerSample({ ...base, pointerId: Number.NaN }, { left: 0, top: 0 })).toBeNull();
    expect(toPointerSample({ ...base, pointerType: "" }, { left: 0, top: 0 })).toBeNull();
    expect(toPointerSample({ ...base, pointerType: "laser" }, { left: 0, top: 0 })).toBeNull();
    expect(toPointerSample({ ...base, pressure: Number.NaN }, { left: 0, top: 0 })).not.toHaveProperty("pressure");
  });

  it("builds a recorder event with a semantic target and no DOM data", () => {
    const s = toPointerSample(base, { left: 0, top: 0 });
    expect(s).not.toBeNull();
    if (!s) return;
    expect(toRecorderEvent("pointerdown", s, "slider-handle")).toEqual({
      type: "pointerdown", x: 150, y: 60, pointerId: 3, pointerType: "touch", target: "slider-handle", pressure: 0.5,
    });
  });
});
