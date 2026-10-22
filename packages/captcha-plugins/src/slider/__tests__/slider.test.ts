import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type InteractionEvent,
  type InteractionSession,
  type PointerType,
} from "@captchalab/captcha-core";
import {
  SLIDER_TARGETS,
  SLIDER_TARGET_MAX,
  SLIDER_TARGET_MIN,
  extractSliderFeatures,
  generateSliderChallenge,
  sliderPlugin,
  verifySliderAnswer,
  type SliderChallenge,
  type SliderFeatureContext,
} from "../index";

/** travel = 340 - 40 = 300px; u(x) = x - 20. Target 0.5 -> 150px along travel. */
const ctx: SliderFeatureContext = { layout: { trackLeft: 0, trackWidth: 340, handleWidth: 40 } };
const challenge: SliderChallenge = { id: "c", target: 0.5, tolerance: 0.02 };
const X = (u: number): number => u + 20; // travel px -> pointer x

type Kind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
function ev(
  t: number,
  type: Kind,
  u: number,
  o: { id?: number; target?: string; pointerType?: PointerType } = {},
): InteractionEvent {
  return {
    t,
    type,
    x: X(u),
    y: 10,
    pointerId: o.id ?? 1,
    pointerType: o.pointerType ?? "mouse",
    target: o.target ?? SLIDER_TARGETS.handle,
  };
}

function session(events: InteractionEvent[]): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "s",
    captchaId: "slider",
    startedAt: 0,
    durationMs: events[events.length - 1]?.t ?? 0,
    events,
    inputModality: inferModality(events),
  };
}

const features = (events: InteractionEvent[]) =>
  extractSliderFeatures(challenge, session(events), ctx).features;

describe("generator", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = generateSliderChallenge({ rng: createRng(1) });
    expect(generateSliderChallenge({ rng: createRng(1) })).toEqual(a);
    expect(generateSliderChallenge({ rng: createRng(2) })).not.toEqual(a);
  });

  it("always produces a valid challenge away from the edges", () => {
    for (let seed = 0; seed < 500; seed++) {
      const c = generateSliderChallenge({ rng: createRng(seed) });
      expect(c.target).toBeGreaterThanOrEqual(SLIDER_TARGET_MIN);
      expect(c.target).toBeLessThanOrEqual(SLIDER_TARGET_MAX);
      expect(c.tolerance).toBeGreaterThan(0);
      expect(c.id).toMatch(/^slider-[0-9a-f]{8}$/);
    }
  });

  it("handles extreme rng values", () => {
    expect(generateSliderChallenge({ rng: () => 0 }).target).toBe(SLIDER_TARGET_MIN);
    expect(generateSliderChallenge({ rng: () => 0.9999999999 }).target).toBeLessThanOrEqual(SLIDER_TARGET_MAX);
  });
});

describe("verifier", () => {
  const c: SliderChallenge = { id: "c", target: 0.5, tolerance: 0.25 }; // exact binary fractions
  it("exact, within, boundary (inclusive), outside", () => {
    expect(verifySliderAnswer(c, { position: 0.5 }).passed).toBe(true);
    expect(verifySliderAnswer(c, { position: 0.6 }).passed).toBe(true);
    expect(verifySliderAnswer(c, { position: 0.75 }).passed).toBe(true);
    expect(verifySliderAnswer(c, { position: 0.25 }).passed).toBe(true);
    const out = verifySliderAnswer(c, { position: 0.76 });
    expect(out.passed).toBe(false);
    expect(out.measurements?.error).toBeCloseTo(0.26);
  });

  it("rejects malformed challenges instead of passing everything", () => {
    for (const bad of [
      { id: "c", target: 0.5, tolerance: Number.POSITIVE_INFINITY },
      { id: "c", target: 0.5, tolerance: -1 },
      { id: "c", target: Number.NaN, tolerance: 0.1 },
      { id: "c", target: 2, tolerance: 0.1 },
    ]) {
      expect(verifySliderAnswer(bad, { position: 0.5 }).passed).toBe(false);
    }
  });

  it("a missing or non-object challenge fails instead of throwing", () => {
    for (const bad of [undefined, null, 5, "x"]) {
      const r = verifySliderAnswer(bad as never, { position: 0.5 });
      expect(r.passed).toBe(false);
    }
  });

  it("rejects malformed or out-of-range answers without throwing", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1]) {
      expect(verifySliderAnswer(c, { position: bad }).passed).toBe(false);
    }
    expect(verifySliderAnswer(c, {} as never).passed).toBe(false);
    expect(verifySliderAnswer(c, null as never).passed).toBe(false);
    expect(verifySliderAnswer(c, { position: "0.5" } as never).passed).toBe(false);
  });

  it("is challenge correctness only: ignores the interaction", () => {
    const empty = session([]);
    expect(sliderPlugin.verify(c, { position: 0.5 }, empty)).toEqual(
      sliderPlugin.verify(c, { position: 0.5 }, session([ev(0, "pointermove", 3)])),
    );
  });
});

describe("slider features", () => {
  it("clean straight drag: no overshoot, small release error", () => {
    const f = features([
      ev(0, "pointerdown", 0),
      ev(100, "pointermove", 50),
      ev(200, "pointermove", 100),
      ev(300, "pointermove", 148),
      ev(400, "pointerup", 148),
    ]);
    expect(f.numberOfAttempts).toBe(1);
    expect(f.dragDuration).toBe(400);
    expect(f.releaseError).toBe(2);
    expect(f.overshoot).toBe(0);
  });

  it("overshoot and correction: 130 -> 155 -> 148 -> 151 with target 150", () => {
    const f = features([
      ev(0, "pointerdown", 0),
      ev(100, "pointermove", 130),
      ev(200, "pointermove", 155),
      ev(300, "pointermove", 148),
      ev(400, "pointerup", 151),
    ]);
    expect(f.overshoot).toBe(5);
    expect(f.releaseError).toBe(1);
  });

  it("approaching from the right is symmetric", () => {
    const f = features([
      ev(0, "pointerdown", 300), // clamped start at the far right
      ev(100, "pointermove", 140), // 10 past the target (to the left)
      ev(200, "pointerup", 152),
    ]);
    expect(f.overshoot).toBe(10);
    expect(f.releaseError).toBe(2);
  });

  it("start exactly at the target has no defined direction: overshoot 0", () => {
    const f = features([ev(0, "pointerdown", 150), ev(50, "pointermove", 170), ev(100, "pointerup", 150)]);
    expect(f.overshoot).toBe(0);
    expect(f.releaseError).toBe(0);
  });

  it("first movement away from the target does not change the direction definition", () => {
    // starts at 100 (target 150 is to the right), wanders left then overshoots to 155.
    const f = features([
      ev(0, "pointerdown", 100),
      ev(50, "pointermove", 60),
      ev(100, "pointermove", 155),
      ev(150, "pointerup", 150),
    ]);
    expect(f.overshoot).toBe(5);
  });

  it("clamps pointer positions to the handle's travel", () => {
    const f = features([ev(0, "pointerdown", 0), ev(50, "pointermove", 500), ev(100, "pointerup", 500)]);
    expect(f.releaseError).toBe(150); // clamped to 300, target 150
    expect(f.overshoot).toBe(150);
  });

  it("uses the final completed attempt and never merges attempts", () => {
    const f = features([
      ev(0, "pointerdown", 0),
      ev(100, "pointermove", 200),
      ev(200, "pointerup", 200), // attempt 1: error 50
      ev(1000, "pointerdown", 0),
      ev(1100, "pointermove", 149),
      ev(1300, "pointerup", 149), // attempt 2: error 1
    ]);
    expect(f.numberOfAttempts).toBe(2);
    expect(f.dragDuration).toBe(300);
    expect(f.releaseError).toBe(1);
    expect(f.overshoot).toBe(0);
    // Motion is session-wide but tracks are not joined (no 0->200->0 jump segment):
    expect(f.pointerDistance).toBe(200 + 149);
  });

  it("a cancelled or unfinished last attempt does not replace the last completed one", () => {
    const f = features([
      ev(0, "pointerdown", 0),
      ev(100, "pointerup", 140),
      ev(500, "pointerdown", 0),
      ev(600, "pointermove", 90),
      ev(700, "pointercancel", 90),
      ev(900, "pointerdown", 0),
      ev(950, "pointermove", 30), // never released
    ]);
    expect(f.numberOfAttempts).toBe(3);
    expect(f.releaseError).toBe(10);
    expect(f.dragDuration).toBe(100);
  });

  it("no completed attempt gives null attempt features, not zeros", () => {
    const f = features([ev(0, "pointerdown", 0), ev(50, "pointermove", 10)]);
    expect(f.numberOfAttempts).toBe(1);
    expect(f.dragDuration).toBeNull();
    expect(f.releaseError).toBeNull();
    expect(f.overshoot).toBeNull();
    expect(features([]).numberOfAttempts).toBe(0);
    expect(features([]).dragDuration).toBeNull();
  });

  it("duplicate timestamps and zero-duration drags stay finite", () => {
    const f = features([ev(10, "pointerdown", 0), ev(10, "pointermove", 100), ev(10, "pointerup", 150)]);
    expect(f.dragDuration).toBe(0);
    expect(f.releaseError).toBe(0);
    expect(Object.values(f).every((v) => v === null || Number.isFinite(v))).toBe(true);
  });

  it("ignores other targets, other pointers and keyboard events for the attempt", () => {
    const f = features([
      ev(0, "pointerdown", 0, { id: 2, target: SLIDER_TARGETS.track }),
      ev(10, "pointerdown", 0, { id: 1 }),
      ev(20, "pointermove", 400, { id: 2, target: SLIDER_TARGETS.track }),
      { t: 25, type: "keydown", code: "Tab" },
      ev(30, "pointermove", 149, { id: 1 }),
      ev(40, "pointerup", 400, { id: 2, target: SLIDER_TARGETS.track }), // must not end pointer 1
      ev(60, "pointerup", 149, { id: 1 }),
    ]);
    expect(f.numberOfAttempts).toBe(1);
    expect(f.dragDuration).toBe(50);
    expect(f.releaseError).toBe(1);
  });

  it("keeps mouse id 1 and touch id 1 separate", () => {
    const f = features([
      ev(0, "pointerdown", 0, { id: 1, pointerType: "touch" }),
      ev(10, "pointerdown", 0, { id: 1, pointerType: "mouse", target: SLIDER_TARGETS.track }),
      ev(20, "pointerup", 400, { id: 1, pointerType: "mouse", target: SLIDER_TARGETS.track }),
      ev(30, "pointermove", 150, { id: 1, pointerType: "touch" }),
      ev(40, "pointerup", 150, { id: 1, pointerType: "touch" }),
    ]);
    expect(f.dragDuration).toBe(40);
    expect(f.releaseError).toBe(0);
  });

  it("touch drag works the same", () => {
    const f = features([
      ev(0, "pointerdown", 0, { pointerType: "touch", id: 7 }),
      ev(80, "pointermove", 152, { pointerType: "touch", id: 7 }),
      ev(160, "pointerup", 152, { pointerType: "touch", id: 7 }),
    ]);
    expect(f.releaseError).toBe(2);
    expect(f.overshoot).toBe(2);
  });

  it("equal release times: the later pointerup in event order wins", () => {
    const f = features([
      ev(0, "pointerdown", 0, { id: 1 }),
      ev(5, "pointerdown", 0, { id: 2 }),
      ev(100, "pointerup", 100, { id: 2 }),
      ev(100, "pointerup", 140, { id: 1 }), // same t, later in order
    ]);
    expect(f.releaseError).toBe(10);
  });

  it("rejects an unusable layout", () => {
    const s = session([]);
    for (const layout of [
      { trackLeft: 0, trackWidth: 40, handleWidth: 40 },
      { trackLeft: 0, trackWidth: 100, handleWidth: -1 },
      { trackLeft: Number.NaN, trackWidth: 100, handleWidth: 10 },
    ]) {
      expect(() => extractSliderFeatures(challenge, s, { layout })).toThrow(RangeError);
    }
  });
});

describe("golden: feature definitions must not change silently", () => {
  const events = [
    ev(0, "pointerdown", 0),
    ev(100, "pointermove", 130),
    ev(200, "pointermove", 155),
    ev(300, "pointermove", 148),
    ev(400, "pointerup", 151),
  ];
  const set = extractSliderFeatures(challenge, session(events), ctx);

  it("pins versions", () => {
    expect(set.schemaVersion).toBe("slider@1;motion@1");
    expect(set.extractorVersion).toBe("slider@1;motion@1");
  });

  it("pins values", () => {
    expect(set.features).toMatchInlineSnapshot(`
      {
        "completionTime": 400,
        "directionChanges": 2,
        "dragDuration": 400,
        "eventCount": 5,
        "interClickTime": 0,
        "maxAcceleration": 10500,
        "maxVelocity": 1300,
        "meanVelocity": 412.5,
        "movementDuration": 400,
        "numberOfAttempts": 1,
        "overshoot": 5,
        "pointerDistance": 165,
        "reactionTime": 0,
        "releaseError": 1,
        "timeToFirstClick": 0,
        "velocityVariance": 269418.75,
        "verticalVariance": 0,
      }
    `);
  });
});
