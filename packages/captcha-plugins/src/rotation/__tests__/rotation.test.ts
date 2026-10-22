import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  deriveRotation,
  extractRotationFeatures,
  generateRotationChallenge,
  normalize360,
  pointerAngleDeg,
  rotationPlugin,
  shortestAngularDistance,
  verifyRotationAnswer,
  wrap180,
  type RotationChallenge,
} from "../index";

const center = { x: 100, y: 100 };
const challenge: RotationChallenge = { id: "c", initialAngle: 90, targetAngle: 0, tolerance: 12 };
const T = "rotation-object";

/** Pointer at angle `deg` (clockwise from the +x axis) at radius 50 around the center. */
const at = (deg: number) => ({ x: center.x + 50 * Math.cos((deg * Math.PI) / 180), y: center.y + 50 * Math.sin((deg * Math.PI) / 180) });
type Kind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
const p = (t: number, type: Kind, deg: number, id = 1): InteractionEvent => ({ t, type, ...at(deg), pointerId: id, pointerType: "mouse", target: T });
const k = (t: number, type: "keydown" | "keyup", code: string): InteractionEvent => ({ t, type, code, target: T });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "rotation", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});
const features = (events: InteractionEvent[], c = challenge) => extractRotationFeatures(c, session(events), { center }).features;

describe("angle math", () => {
  it("wraps and measures the shortest distance across 359 <-> 0", () => {
    expect(normalize360(-10)).toBe(350);
    expect(normalize360(725)).toBe(5);
    expect(wrap180(190)).toBe(-170);
    expect(wrap180(-190)).toBe(170);
    expect(shortestAngularDistance(359, 0)).toBe(1);
    expect(shortestAngularDistance(1, 359)).toBe(2);
    expect(shortestAngularDistance(180, 0)).toBe(180);
    expect(shortestAngularDistance(-720, 10)).toBe(10);
  });

  it("pointer angles are clockwise on screen (y down)", () => {
    expect(pointerAngleDeg({ x: 150, y: 100 }, center)).toBeCloseTo(0);
    expect(pointerAngleDeg({ x: 100, y: 150 }, center)).toBeCloseTo(90);
    expect(pointerAngleDeg({ x: 50, y: 100 }, center)).toBeCloseTo(180);
  });
});

describe("generator", () => {
  it("is deterministic, valid and never already solved", () => {
    expect(generateRotationChallenge({ rng: createRng(3) })).toEqual(generateRotationChallenge({ rng: createRng(3) }));
    for (let seed = 0; seed < 300; seed++) {
      const c = generateRotationChallenge({ rng: createRng(seed) });
      expect(c.initialAngle).toBeGreaterThanOrEqual(40);
      expect(c.initialAngle).toBeLessThanOrEqual(320);
      expect(shortestAngularDistance(c.initialAngle, c.targetAngle)).toBeGreaterThan(c.tolerance);
      expect(c.id).toMatch(/^rotation-[0-9a-f]{8}$/);
    }
  });
});

describe("verifier", () => {
  it("passes within tolerance including across the wrap, fails outside, boundary is inclusive", () => {
    expect(verifyRotationAnswer(challenge, { angle: 0 }).passed).toBe(true);
    expect(verifyRotationAnswer(challenge, { angle: 355 }).passed).toBe(true);
    expect(verifyRotationAnswer(challenge, { angle: -3 }).passed).toBe(true);
    expect(verifyRotationAnswer(challenge, { angle: 12 }).passed).toBe(true);
    expect(verifyRotationAnswer(challenge, { angle: 348 }).passed).toBe(true);
    expect(verifyRotationAnswer(challenge, { angle: 12.01 }).passed).toBe(false);
    expect(verifyRotationAnswer(challenge, { angle: 180 }).passed).toBe(false);
    expect(verifyRotationAnswer(challenge, { angle: 720 }).passed).toBe(true); // full turns do not matter
  });

  it("malformed answers/challenges fail without throwing; the interaction is ignored", () => {
    for (const a of [undefined, null, {}, { angle: "0" }, { angle: Number.NaN }, { angle: Infinity }]) {
      expect(verifyRotationAnswer(challenge, a as never).passed).toBe(false);
    }
    for (const c of [undefined, null, {}, { ...challenge, tolerance: -1 }, { ...challenge, tolerance: Number.NaN }]) {
      expect(verifyRotationAnswer(c as never, { angle: 0 }).passed).toBe(false);
    }
    expect(rotationPlugin.verify(challenge, { angle: 0 }, session([]))).toEqual(rotationPlugin.verify(challenge, { angle: 0 }, session([p(0, "pointerdown", 0)])));
  });
});

describe("rotation simulation and features", () => {
  // grab at 0 deg, turn counter-clockwise (negative) by 90 in three steps: 90 -> 0 (upright)
  const solve = [p(100, "pointerdown", 0), p(200, "pointermove", -30), p(300, "pointermove", -60), p(400, "pointerup", -90)];

  it("a pointer drag turns the object relative to where it was grabbed (no snap) and wraps correctly", () => {
    const a = deriveRotation(challenge, { center }, session(solve));
    expect(a.finalAngle).toBeCloseTo(0);
    expect(a.timeline.map((x) => Math.round(x.angle))).toEqual([90, 60, 30, 0]);
    // crossing the +-180 seam must not produce a 360 degree jump
    const seam = deriveRotation(challenge, { center }, session([p(0, "pointerdown", 170), p(10, "pointermove", 190), p(20, "pointerup", 200)]));
    expect(seam.drags[0]!.steps.map((s) => Math.round(s.delta))).toEqual([20, 10]);
  });

  it("clean pointer solve: timing, distance, velocities, no corrections, exact final error", () => {
    const f = features(solve);
    expect(f).toMatchObject({ reactionTime: 100, rotationDuration: 300, attemptCount: 1, angularCorrections: 0, inputModality: "mouse", eventCount: 4 });
    expect(f.angularDistance).toBeCloseTo(90);
    expect(f.meanAngularVelocity).toBeCloseTo(300); // 90 deg over 300 ms
    expect(f.maxAngularVelocity).toBeCloseTo(300);
    expect(f.finalAngularError).toBeCloseTo(0);
  });

  it("overshoot and correction are counted as direction reversals", () => {
    const f = features([p(0, "pointerdown", 0), p(100, "pointermove", -100), p(200, "pointermove", -80), p(300, "pointerup", -90)]);
    expect(f.angularCorrections).toBe(2); // -100, then +20, then -10
    expect(f.angularDistance).toBeCloseTo(100 + 20 + 10);
    expect(f.finalAngularError).toBeCloseTo(0);
  });

  it("keyboard: each arrow keydown turns 5 degrees; bursts are attempts; reversals counted", () => {
    const keys = [
      ...Array.from({ length: 18 }, (_, i) => [k(100 + i * 50, "keydown", "ArrowLeft"), k(120 + i * 50, "keyup", "ArrowLeft")]).flat(), // 90 -> 0
      k(5000, "keydown", "ArrowRight"), k(5020, "keyup", "ArrowRight"), // second burst: +5
    ];
    const a = deriveRotation(challenge, { center }, session(keys));
    expect(a.finalAngle).toBe(5);
    const f = features(keys);
    expect(f).toMatchObject({ inputModality: "keyboard", attemptCount: 2, angularCorrections: 1, finalAngularError: 5, meanAngularVelocity: null, maxAngularVelocity: null });
    expect(f.angularDistance).toBe(95);
    expect(f.reactionTime).toBe(100);
    expect(f.rotationDuration).toBe(5020 - 100);
    expect(verifyRotationAnswer(challenge, { angle: a.finalAngle }).passed).toBe(true);
  });

  it("a cancelled drag is discarded (angle restored) and only counts as an attempt; second drag succeeds", () => {
    const f = features([p(0, "pointerdown", 0), p(50, "pointermove", 60), p(80, "pointercancel", 60), ...solve.map((e) => ({ ...e, t: e.t + 1000 }))]);
    expect(f.attemptCount).toBe(2);
    expect(f.finalAngularError).toBeCloseTo(0, 5);
    expect(f.angularDistance).toBeCloseTo(90); // the cancelled drag's 60 degrees do not count
  });

  it("no input: nulls and zeros, error is the initial distance; unrelated targets are ignored", () => {
    expect(features([])).toMatchObject({ reactionTime: null, rotationDuration: null, angularDistance: 0, attemptCount: 0, finalAngularError: 90, inputModality: "none" });
    const other: InteractionEvent[] = [{ ...p(0, "pointerdown", 0), target: "elsewhere" }, { ...p(10, "pointerup", 90), target: "elsewhere" }];
    expect(features(other)).toMatchObject({ reactionTime: null, attemptCount: 0, angularDistance: 0 });
  });

  it("duplicate timestamps stay finite; mixed input is mixed", () => {
    const f = features([p(5, "pointerdown", 0), p(5, "pointermove", -45), p(5, "pointerup", -90), k(900, "keydown", "ArrowRight")]);
    expect(f.inputModality).toBe("mixed");
    expect(f.maxAngularVelocity).toBeNull(); // dt = 0
    expect(Object.values(f).every((v) => v === null || typeof v === "string" || Number.isFinite(v))).toBe(true);
  });
});

describe("golden: definitions must not change silently", () => {
  it("pins versions and values", () => {
    const set = extractRotationFeatures(challenge, session([p(100, "pointerdown", 0), p(200, "pointermove", -100), p(300, "pointermove", -80), p(400, "pointerup", -90)]), { center });
    expect(set.schemaVersion).toBe("rotation@1");
    expect(set.extractorVersion).toBe("rotation@1");
    expect(set.features).toMatchInlineSnapshot(`
      {
        "angularCorrections": 2,
        "angularDistance": 130,
        "attemptCount": 1,
        "completionTime": 400,
        "eventCount": 4,
        "finalAngularError": 0,
        "inputModality": "mouse",
        "maxAngularVelocity": 1000,
        "meanAngularVelocity": 433.33333333333337,
        "reactionTime": 100,
        "rotationDuration": 300,
      }
    `);
  });
});
