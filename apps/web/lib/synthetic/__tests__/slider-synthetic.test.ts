import { describe, expect, it } from "vitest";
import { createRng, isPointerEvent } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { DEFAULT_SYNTHETIC_LAYOUT, SYNTHETIC_PROFILES, generateSyntheticSliderSession } from "../slider-synthetic";

const slider = registry.get("slider");
const challenge = slider.generate({ rng: createRng(4) });

describe("generateSyntheticSliderSession", () => {
  it("is deterministic per seed and differs across seeds for the noisy profile", () => {
    const a = generateSyntheticSliderSession({ profile: "noisy", challenge, seed: 3 });
    expect(generateSyntheticSliderSession({ profile: "noisy", challenge, seed: 3 })).toEqual(a);
    expect(generateSyntheticSliderSession({ profile: "noisy", challenge, seed: 4 })).not.toEqual(a);
    const l = generateSyntheticSliderSession({ profile: "linear", challenge, seed: 1 });
    expect(generateSyntheticSliderSession({ profile: "linear", challenge, seed: 99 })).toEqual(l);
  });

  it.each(SYNTHETIC_PROFILES)("%s: valid session, monotonic time, one drag, passes verification", (profile) => {
    const s = generateSyntheticSliderSession({ profile, challenge, seed: 2 });
    for (let i = 1; i < s.events.length; i++) expect(s.events[i]!.t).toBeGreaterThanOrEqual(s.events[i - 1]!.t);
    expect(s.events.every(isPointerEvent)).toBe(true);
    expect(s.events[0]!.type).toBe("pointerdown");
    expect(s.events.at(-1)!.type).toBe("pointerup");
    expect(s.durationMs).toBeGreaterThan(s.events.at(-1)!.t);
    const f = slider.extractFeatures(challenge, s, { layout: DEFAULT_SYNTHETIC_LAYOUT }).features;
    expect(f.numberOfAttempts).toBe(1);
    expect(f.releaseError).toBeLessThan(1);
    const end = s.events.at(-1)!;
    const position = isPointerEvent(end) ? (end.x - 22) / (DEFAULT_SYNTHETIC_LAYOUT.trackWidth - DEFAULT_SYNTHETIC_LAYOUT.handleWidth) : -1;
    expect(slider.verify(challenge, { position }, s).passed).toBe(true);
  });

  it("profiles differ in the measured dimensions", () => {
    const f = (profile: "linear" | "eased" | "noisy") =>
      slider.extractFeatures(challenge, generateSyntheticSliderSession({ profile, challenge, seed: 2 }), {
        layout: DEFAULT_SYNTHETIC_LAYOUT,
      }).features;
    const linear = f("linear");
    const eased = f("eased");
    const noisy = f("noisy");
    expect(linear.directionChanges).toBe(0);
    expect(eased.directionChanges).toBe(0);
    expect(linear.maxVelocity).toBeLessThan(eased.maxVelocity);
    expect(noisy.overshoot ?? 0).toBeGreaterThan(0);
    expect(noisy.pointerDistance).toBeGreaterThan(linear.pointerDistance);
  });

  it("stop-and-correct pauses (a long gap between two samples) and turns back once past the target", () => {
    const s = generateSyntheticSliderSession({ profile: "stop-and-correct", challenge, seed: 2 });
    const gaps = s.events.slice(1).map((e, i) => e.t - s.events[i]!.t);
    expect(Math.max(...gaps)).toBeGreaterThanOrEqual(250);
    const f = slider.extractFeatures(challenge, s, { layout: DEFAULT_SYNTHETIC_LAYOUT }).features;
    expect(f.directionChanges).toBe(1);
    expect(f.overshoot ?? 0).toBeGreaterThan(0);
  });
});
