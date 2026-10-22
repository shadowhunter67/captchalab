import { describe, expect, it } from "vitest";
import { createEventRecorder } from "@captchalab/captcha-core";
import { deriveRotation, extractRotationFeatures, type RotationAnswer, type RotationChallenge } from "@captchalab/captcha-plugins";
import type { PointerSample } from "@/lib/pointer-adapter";
import { RotationController } from "../rotation-controller";
import { angularVelocitySegments, createRotationReplay, rotationMetrics } from "../rotation-view-data";
import { formatMetricValue } from "@/lib/inspect/metrics";

const center = { x: 100, y: 100 };
const challenge: RotationChallenge = { id: "c", initialAngle: 90, targetAngle: 0, tolerance: 12 };

function setup() {
  let clock = 0;
  const recorder = createEventRecorder({ captchaId: "rotation", now: () => clock });
  const angles: number[] = [];
  const verifies: RotationAnswer[] = [];
  let inputs = 0;
  const controller = new RotationController({
    recorder, challenge,
    onAngle: (a) => angles.push(a), onInput: () => void inputs++, onVerify: (a) => verifies.push(a),
  });
  const released: number[] = [];
  controller.releasePointer = (id) => released.push(id);
  return { controller, recorder, angles, verifies, released, inputs: () => inputs, last: () => angles[angles.length - 1] as number, tick: (ms: number) => { clock += ms; } };
}
const at = (deg: number, id = 1): PointerSample => ({
  x: center.x + 50 * Math.cos((deg * Math.PI) / 180), y: center.y + 50 * Math.sin((deg * Math.PI) / 180), pointerId: id, pointerType: "mouse",
});
const types = (r: { snapshot(): { events: readonly { type: string }[] } }) => r.snapshot().events.map((e) => e.type);

describe("RotationController", () => {
  it("paints the initial angle and turns relative to the grab point (no snap)", () => {
    const { controller, angles, last } = setup();
    controller.paint();
    expect(angles).toEqual([90]);
    controller.pointerDown(at(30), center); // grabbed at 30 degrees
    expect(last()).toBe(90); // nothing moved yet
    controller.pointerMove(at(10));
    expect(last()).toBeCloseTo(70); // -20 degrees
    controller.pointerMove(at(-60));
    expect(last()).toBeCloseTo(0);
  });

  it("wraps across the seam: 359 and 0 are neighbours", () => {
    const { controller, last } = setup();
    controller.pointerDown(at(10), center);
    controller.pointerUp(at(-80)); // -90 total
    expect(last()).toBeCloseTo(0);
    controller.pointerDown(at(10), center);
    controller.pointerUp(at(-5)); // -15: 0 -> 345
    expect(last()).toBeCloseTo(345);
  });

  it("pointercancel restores the angle from before the drag and records it; lost capture ignores the rest", () => {
    const { controller, recorder, last, released } = setup();
    controller.pointerDown(at(0), center);
    controller.pointerMove(at(-40));
    controller.pointerCancel(1, at(-40));
    expect(last()).toBe(90);
    expect(types(recorder)).toEqual(["pointerdown", "pointermove", "pointercancel"]);
    controller.pointerDown(at(0), center);
    controller.lostCapture(1, at(-10));
    expect(released).toEqual([1, 1]);
    controller.pointerMove(at(-50)); // still held: ignored
    expect(controller.pointerUp(at(-60))).toBe(false);
    expect(last()).toBe(90);
  });

  it("keyboard turns 5 degrees per press (auto-repeat included); other keys are ignored", () => {
    const { controller, recorder, last, inputs } = setup();
    controller.keyDown("ArrowLeft");
    controller.keyDown("ArrowLeft");
    controller.keyDown("ArrowRight");
    controller.keyDown("KeyA");
    controller.keyUp("ArrowRight");
    controller.keyUp("KeyA");
    expect(last()).toBe(85);
    expect(types(recorder)).toEqual(["keydown", "keydown", "keydown", "keyup"]);
    expect(inputs()).toBe(3);
    expect(recorder.snapshot().events.every((e) => "code" in e && e.code.startsWith("Arrow"))).toBe(true); // codes only
  });

  it("arrow keys are ignored while dragging, so a cancelled drag cannot disagree with the analysis", () => {
    const { controller, recorder, last } = setup();
    controller.pointerDown(at(0), center);
    controller.pointerMove(at(-30));
    controller.keyDown("ArrowRight"); // ignored: a drag is in progress
    controller.keyUp("ArrowRight");
    controller.pointerCancel(1, at(-30));
    expect(last()).toBe(90);
    expect(types(recorder)).toEqual(["pointerdown", "pointermove", "pointercancel"]);
    expect(deriveRotation(challenge, { center }, recorder.snapshot()).finalAngle).toBeCloseTo(90);
  });

  it("verify submits the current angle and center; not while dragging; second pointer ignored", () => {
    const { controller, verifies } = setup();
    controller.pointerDown(at(0), { x: 100, y: 100 });
    expect(controller.pointerDown(at(0, 2), center)).toBe(false);
    controller.verify();
    expect(verifies).toHaveLength(0);
    controller.pointerUp(at(-90));
    controller.verify();
    expect(verifies[0]!.angle).toBeCloseTo(0);
  });

  it("dispose releases a held pointer and stops recording; activate restores", () => {
    const { controller, recorder, released } = setup();
    controller.pointerDown(at(0), center);
    controller.dispose();
    expect(released).toEqual([1]);
    controller.keyDown("ArrowLeft");
    expect(types(recorder)).toEqual(["pointerdown"]);
    controller.activate();
    controller.keyDown("ArrowLeft");
    expect(types(recorder)).toEqual(["pointerdown", "keydown"]);
  });

  it("the live controller and the feature extractor agree on the final angle, mixed pointer + keyboard + cancel", () => {
    const { controller, recorder, last, tick } = setup();
    controller.pointerDown(at(0), center); tick(50);
    controller.pointerMove(at(-50)); tick(50);
    controller.pointerCancel(1, at(-50)); tick(50); // discarded
    controller.pointerDown(at(0), center); tick(50);
    controller.pointerMove(at(-100)); tick(50);
    controller.pointerUp(at(-80)); tick(100); // net -80: 90 -> 10
    controller.keyDown("ArrowLeft"); controller.keyUp("ArrowLeft"); tick(100); // 5
    const session = recorder.snapshot();
    const a = deriveRotation(challenge, { center }, session);
    expect(a.finalAngle).toBeCloseTo(last());
    expect(a.finalAngle).toBeCloseTo(5);
    const f = extractRotationFeatures(challenge, session, { center }).features;
    expect(f.finalAngularError).toBeCloseTo(5);
    expect(f.attemptCount).toBe(3); // cancelled drag + drag + keyboard burst
  });
});

describe("rotation view data", () => {
  const events = (() => {
    const { controller, recorder, tick } = setup();
    controller.pointerDown(at(0), center); tick(100);
    controller.pointerMove(at(-100)); tick(100);
    controller.pointerUp(at(-90));
    return recorder.snapshot();
  })();

  it("metrics: raw values with degree units, dashes for unavailable ones", () => {
    const f = extractRotationFeatures(challenge, events, { center }).features;
    const shown = Object.fromEntries(rotationMetrics(f).map((r) => [r.id, formatMetricValue(r)]));
    expect(shown).toMatchObject({ finalAngularError: "0.0°", attemptCount: "1", inputModality: "mouse", angularCorrections: "1" });
    const none = Object.fromEntries(rotationMetrics(extractRotationFeatures(challenge, { ...events, events: [] }, { center }).features).map((r) => [r.id, formatMetricValue(r)]));
    expect(none).toMatchObject({ reactionTime: "—", meanAngularVelocity: "—", finalAngularError: "90.0°" });
  });

  it("angular velocity: one signed segment per released drag", () => {
    const seg = angularVelocitySegments(deriveRotation(challenge, { center }, events));
    expect(seg).toHaveLength(1);
    expect(seg[0]!.map((s) => Math.round(s.value))).toEqual([-1000, 100]); // -100 deg in 100ms, then +10 deg in 100ms
  });

  it("replay shows a cancelled drag turning the object and then going back; features ignore it", () => {
    const { controller, recorder, tick } = setup();
    controller.pointerDown(at(0), center); tick(100);
    controller.pointerMove(at(-40)); tick(100);
    controller.pointerCancel(1, at(-40));
    const s = recorder.snapshot();
    const m = createRotationReplay(challenge, center, s);
    expect(Math.round(m.at(100))).toBe(50); // 90 - 40
    expect(Math.round(m.at(200))).toBe(90); // restored
    expect(extractRotationFeatures(challenge, s, { center }).features).toMatchObject({ angularDistance: 0, attemptCount: 1, finalAngularError: 90 });
  });

  it("replay: the object holds each recorded angle; no input means no replay", () => {
    const m = createRotationReplay(challenge, center, events);
    expect(m.range).toEqual([0, 200]);
    expect(Math.round(m.at(-5))).toBe(90);
    expect(Math.round(m.at(100))).toBe(-10 + 360);
    expect(Math.round(m.at(500))).toBe(0);
    expect(createRotationReplay(challenge, center, { ...events, events: [] }).range).toBeNull();
  });
});
