import { describe, expect, it } from "vitest";
import {
  isValidSliderLayout,
  pointerXToPosition,
  pointerXToTravelPx,
  positionToTravelPx,
  sliderTravel,
} from "../geometry";

const layout = { trackLeft: 0, trackWidth: 340, handleWidth: 40 }; // travel 300

describe("slider geometry", () => {
  it("maps pointer x to travel px with the handle centered under the pointer", () => {
    expect(pointerXToTravelPx(20, layout)).toBe(0);
    expect(pointerXToTravelPx(170, layout)).toBe(150);
    expect(pointerXToPosition(170, layout)).toBe(0.5);
  });

  it("clamps at both ends", () => {
    expect(pointerXToTravelPx(-50, layout)).toBe(0);
    expect(pointerXToTravelPx(999, layout)).toBe(300);
    expect(pointerXToPosition(999, layout)).toBe(1);
  });

  it("honors trackLeft", () => {
    expect(pointerXToTravelPx(270, { ...layout, trackLeft: 100 })).toBe(150);
  });

  it("normalized -> px and back", () => {
    expect(positionToTravelPx(0.25, layout)).toBe(75);
    expect(positionToTravelPx(2, layout)).toBe(300);
    expect(positionToTravelPx(-1, layout)).toBe(0);
    expect(pointerXToPosition(positionToTravelPx(0.3, layout) + 20, layout)).toBeCloseTo(0.3);
  });

  it("rejects invalid layouts", () => {
    for (const bad of [
      { trackLeft: 0, trackWidth: 40, handleWidth: 40 },
      { trackLeft: 0, trackWidth: 0, handleWidth: 0 },
      { trackLeft: 0, trackWidth: 30, handleWidth: 40 },
      { trackLeft: Number.NaN, trackWidth: 300, handleWidth: 40 },
      { trackLeft: 0, trackWidth: 300, handleWidth: -1 },
    ]) {
      expect(isValidSliderLayout(bad)).toBe(false);
      expect(() => sliderTravel(bad)).toThrow(RangeError);
    }
    expect(isValidSliderLayout(layout)).toBe(true);
  });
});
