import { describe, expect, it } from "vitest";
import { createEventRecorder } from "@captchalab/captcha-core";
import { registry, type SliderAnswer, type SliderChallenge, type SliderLayout } from "@captchalab/captcha-plugins";
import type { PointerSample } from "@/lib/pointer-adapter";
import { SliderController, type SliderPhase } from "../slider-controller";

const layout: SliderLayout = { trackLeft: 0, trackWidth: 340, handleWidth: 40 }; // travel 300
const challenge: SliderChallenge = { id: "c", target: 0.5, tolerance: 0.02 };

function setup() {
  let clock = 0;
  const recorder = createEventRecorder({ captchaId: "slider", now: () => clock });
  const positions: number[] = [];
  const phases: SliderPhase[] = [];
  const submits: { answer: SliderAnswer; layout: SliderLayout }[] = [];
  const controller = new SliderController({
    recorder,
    onPosition: (p) => positions.push(p),
    onPhase: (p) => phases.push(p),
    onSubmit: (answer, l) => submits.push({ answer, layout: l }),
  });
  controller.setLayout(layout);
  return {
    controller, recorder, positions, phases, submits,
    tick: (ms: number) => { clock += ms; },
  };
}

// x for a travel position u (px): u + handleWidth/2
const at = (u: number, pointerId = 1, pointerType: PointerSample["pointerType"] = "mouse"): PointerSample => ({
  x: u + 20, y: 10, pointerId, pointerType,
});

describe("SliderController", () => {
  it("is disabled until a valid layout arrives, and again when it becomes invalid", () => {
    const { controller } = setup();
    controller.setLayout(null);
    expect(controller.currentPhase).toBe("disabled");
    expect(controller.pointerDown(at(0), true)).toBe(false);
    controller.setLayout({ trackLeft: 0, trackWidth: 40, handleWidth: 40 });
    expect(controller.currentPhase).toBe("disabled");
    controller.setLayout(layout);
    expect(controller.currentPhase).toBe("ready");
  });

  it("down -> move -> up records semantic events and submits the final position", () => {
    const { controller, recorder, submits, tick } = setup();
    expect(controller.pointerDown(at(0), true)).toBe(true);
    tick(100);
    controller.pointerMove(at(150));
    tick(100);
    expect(controller.pointerUp(at(151))).toBe(true);
    expect(submits).toHaveLength(1);
    expect(submits[0]?.answer.position).toBeCloseTo(151 / 300);
    const events = recorder.snapshot().events;
    expect(events.map((e) => e.type)).toEqual(["pointerdown", "pointermove", "pointerup"]);
    expect(events.every((e) => "pointerId" in e && e.pointerId === 1 && e.target === "slider-handle")).toBe(true);
    expect(controller.currentPhase).toBe("submitted");
  });

  it("pointercancel never submits, records a cancel and resets the handle", () => {
    const { controller, recorder, submits, positions } = setup();
    controller.pointerDown(at(0), true);
    controller.pointerMove(at(120));
    expect(controller.pointerCancel(1, at(120))).toBe(true);
    expect(submits).toHaveLength(0);
    expect(recorder.snapshot().events.at(-1)?.type).toBe("pointercancel");
    expect(positions.at(-1)).toBe(0);
    expect(controller.currentPhase).toBe("ready");
    expect(controller.isDragging).toBe(false);
  });

  it("lost capture after a normal pointerup is a no-op (no duplicate cancel)", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(0), true);
    controller.pointerUp(at(100));
    const n = recorder.size;
    expect(controller.lostCapture(1)).toBe(false);
    expect(controller.pointerCancel(1)).toBe(false);
    expect(recorder.size).toBe(n);
  });

  it("ignores a second pointer and pointer ids that are not dragging", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(0, 1, "touch"), true);
    expect(controller.pointerDown(at(50, 2, "touch"), true)).toBe(false);
    controller.pointerMove(at(200, 2, "touch"));
    expect(controller.pointerUp(at(200, 2, "touch"))).toBe(false);
    expect(recorder.size).toBe(1);
    expect(controller.isDragging).toBe(true);
  });

  it("does not start a drag from the track", () => {
    const { controller, recorder } = setup();
    expect(controller.pointerDown(at(0), false)).toBe(false);
    expect(recorder.size).toBe(0);
  });

  it("records mouse hover approach as track movement, but not touch hover", () => {
    const { controller, recorder } = setup();
    controller.pointerMove(at(10, 1, "mouse"));
    controller.pointerMove(at(20, 2, "touch"));
    const events = recorder.snapshot().events;
    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe("slider-track");
  });

  it("cancels an active drag when the layout changes (resize), without submitting", () => {
    const { controller, recorder, submits } = setup();
    controller.pointerDown(at(0), true);
    controller.pointerMove(at(100));
    controller.setLayout({ ...layout, trackWidth: 400 });
    expect(controller.isDragging).toBe(false);
    expect(controller.currentPhase).toBe("ready");
    expect(recorder.snapshot().events.at(-1)?.type).toBe("pointercancel");
    expect(controller.pointerUp(at(100))).toBe(false);
    expect(submits).toHaveLength(0);
  });

  it("after a resize abort, the still-down pointer is released and its later events are dropped", () => {
    const { controller, recorder } = setup();
    const released: number[] = [];
    controller.releasePointer = (id) => released.push(id);
    controller.pointerDown(at(0), true);
    controller.setLayout({ ...layout, trackWidth: 400 });
    expect(released).toEqual([1]);
    const n = recorder.size;
    controller.pointerMove(at(50)); // mouse still held: must not become hover events
    expect(controller.pointerUp(at(50))).toBe(false);
    expect(recorder.size).toBe(n);
    controller.pointerMove(at(60)); // after pointerup the pointer is free again: hover resumes
    expect(recorder.size).toBe(n + 1);
  });

  it("lostCapture without pointerup aborts without submitting and ignores the rest", () => {
    const { controller, submits } = setup();
    controller.pointerDown(at(0), true);
    expect(controller.lostCapture(1)).toBe(true);
    expect(controller.pointerUp(at(10))).toBe(false);
    expect(submits).toHaveLength(0);
    expect(controller.currentPhase).toBe("ready");
  });

  it("a native pointercancel does not leave the pointer ignored", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(0), true);
    controller.pointerCancel(1, at(5));
    const n = recorder.size;
    controller.pointerMove(at(20));
    expect(recorder.size).toBe(n + 1);
  });

  it("an unchanged layout during a drag does not cancel it", () => {
    const { controller } = setup();
    controller.pointerDown(at(0), true);
    controller.setLayout({ ...layout });
    expect(controller.isDragging).toBe(true);
  });

  it("layout becoming invalid mid-drag aborts safely", () => {
    const { controller, submits } = setup();
    controller.pointerDown(at(0), true);
    controller.setLayout(null);
    expect(controller.isDragging).toBe(false);
    expect(controller.currentPhase).toBe("disabled");
    expect(submits).toHaveLength(0);
  });

  it("tryAgain unlocks after submit and attempts accumulate in one session", () => {
    const { controller, recorder, submits, tick } = setup();
    controller.pointerDown(at(0), true);
    controller.pointerUp(at(200));
    expect(controller.pointerDown(at(0), true)).toBe(false); // locked while submitted
    controller.tryAgain();
    tick(50);
    controller.pointerDown(at(0), true);
    tick(50);
    controller.pointerUp(at(150));
    expect(submits).toHaveLength(2);
    const set = registry.get("slider").extractFeatures(challenge, recorder.snapshot(), { layout });
    expect(set.features.numberOfAttempts).toBe(2);
    expect(set.features.releaseError).toBe(0);
  });

  it("keyboard: arrows move, Enter submits; features carry no pointer attempt", () => {
    const { controller, recorder, submits, positions } = setup();
    controller.keyDown("ArrowRight");
    controller.keyUp("ArrowRight");
    controller.keyDown("End");
    controller.keyDown("ArrowLeft");
    expect(positions.at(-1)).toBeCloseTo(0.99);
    controller.keyDown("KeyA"); // unrelated keys are never recorded
    controller.keyDown("Enter");
    expect(submits[0]?.answer.position).toBeCloseTo(0.99);
    const session = recorder.snapshot();
    expect(session.events.every((e) => "code" in e && e.code !== "KeyA")).toBe(true);
    expect(session.inputModality).toBe("keyboard");
    const set = registry.get("slider").extractFeatures(challenge, session, { layout });
    expect(set.features.numberOfAttempts).toBe(0);
    expect(set.features.dragDuration).toBeNull();
  });

  it("Enter submit does not record a keyup that would leak into a retry; unmatched keyups are dropped", () => {
    const { controller, recorder } = setup();
    controller.keyUp("ArrowLeft"); // no matching keydown
    controller.keyDown("Enter");
    controller.keyUp("Enter");
    controller.tryAgain();
    expect(recorder.snapshot().events.map((e) => e.type)).toEqual(["keydown"]);
  });

  it("reports how the submission was made", () => {
    const vias: string[] = [];
    let clock = 0;
    const recorder = createEventRecorder({ captchaId: "slider", now: () => clock++ });
    const c = new SliderController({ recorder, onPosition: () => {}, onPhase: () => {}, onSubmit: (_a, _l, via) => vias.push(via) });
    c.setLayout(layout);
    c.pointerDown(at(0), true);
    c.pointerUp(at(10));
    c.tryAgain();
    c.keyDown("Enter");
    expect(vias).toEqual(["pointer", "keyboard"]);
  });

  it("after dispose nothing is recorded", () => {
    const { controller, recorder } = setup();
    controller.dispose();
    controller.pointerDown(at(0), true);
    controller.keyDown("ArrowRight");
    expect(recorder.size).toBe(0);
  });
});
