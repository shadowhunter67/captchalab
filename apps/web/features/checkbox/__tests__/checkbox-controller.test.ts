import { describe, expect, it } from "vitest";
import { createEventRecorder } from "@captchalab/captcha-core";
import { registry, type CheckboxAnswer, type CheckboxChallenge } from "@captchalab/captcha-plugins";
import type { PointerSample } from "@/lib/pointer-adapter";
import { CheckboxController } from "../checkbox-controller";

const challenge: CheckboxChallenge = { id: "c", expectedChecked: true };

function setup() {
  let clock = 0;
  const recorder = createEventRecorder({ captchaId: "checkbox", now: () => clock });
  const checkedLog: boolean[] = [];
  const submits: CheckboxAnswer[] = [];
  let clears = 0;
  const controller = new CheckboxController({
    recorder,
    onChecked: (c) => checkedLog.push(c),
    onSubmit: (a) => submits.push(a),
    onClear: () => void clears++,
  });
  return { controller, recorder, checkedLog, submits, clears: () => clears, tick: (ms: number) => { clock += ms; } };
}

const at = (id = 1, type: PointerSample["pointerType"] = "mouse"): PointerSample => ({ x: 20, y: 10, pointerId: id, pointerType: type });
const types = (r: { snapshot(): { events: readonly { type: string }[] } }) => r.snapshot().events.map((e) => e.type);

describe("CheckboxController", () => {
  it("pointer activation records down/up on the semantic target, and the native change submits afterwards", () => {
    const { controller, recorder, submits, checkedLog, tick } = setup();
    controller.pointerDown(at());
    tick(80);
    controller.pointerUp(at());
    // The native click/change follows pointerup: only now is the answer submitted.
    expect(submits).toHaveLength(0);
    controller.change(true);
    expect(types(recorder)).toEqual(["pointerdown", "pointerup"]);
    expect(recorder.snapshot().events.every((e) => e.target === "checkbox-control")).toBe(true);
    expect(checkedLog).toEqual([true]);
    expect(submits).toEqual([{ checked: true }]);
  });

  it("the snapshot at submit time already contains the release, so features see the full activation", () => {
    const { controller, recorder, tick } = setup();
    let seen: ReturnType<typeof recorder.snapshot> | null = null;
    const c2 = new CheckboxController({
      recorder, onChecked: () => {}, onClear: () => {}, onSubmit: () => { seen = recorder.snapshot(); },
    });
    c2.pointerDown(at()); tick(50); c2.pointerUp(at()); c2.change(true);
    expect(controller.isPressed).toBe(false);
    const set = registry.get("checkbox").extractFeatures(challenge, seen as never);
    expect(set.features).toMatchObject({ activationCount: 1, pressDuration: 50, successfulActivationIndex: 1 });
  });

  it("keyboard: Space down/up recorded once (repeat ignored), other keys ignored, Enter does nothing", () => {
    const { controller, recorder } = setup();
    controller.keyDown("Enter", false);
    controller.keyDown("KeyA", false);
    controller.keyDown("Space", false);
    controller.keyDown("Space", true); // auto-repeat
    controller.keyDown("Space", false); // already held
    controller.keyUp("Enter");
    controller.keyUp("Space");
    controller.keyUp("Space"); // not held any more
    expect(types(recorder)).toEqual(["keydown", "keyup"]);
    expect(recorder.snapshot().events.map((e) => ("code" in e ? e.code : null))).toEqual(["Space", "Space"]);
  });

  it("a press that is never released (mouse let go elsewhere) is not an activation and does not block the next press", () => {
    const { controller, recorder, tick } = setup();
    controller.pointerDown(at());
    tick(30);
    controller.pointerDown(at()); // next press: the first one was never released
    tick(30);
    controller.pointerUp(at());
    const f = registry.get("checkbox").extractFeatures(challenge, recorder.snapshot()).features;
    expect(f).toMatchObject({ activationCount: 1, pressDuration: 30 });
  });

  it("a release slightly outside is still recorded as a release when the browser delivers it (touch capture)", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(1, "touch"));
    controller.pointerUp({ x: -3, y: 10, pointerId: 1, pointerType: "touch" });
    expect(types(recorder)).toEqual(["pointerdown", "pointerup"]);
  });

  it("losing focus while Space is held resets the held flag so the next press is recorded", () => {
    const { controller, recorder } = setup();
    controller.keyDown("Space", false);
    controller.blur();
    controller.keyDown("Space", false);
    controller.keyUp("Space");
    expect(types(recorder)).toEqual(["keydown", "keydown", "keyup"]);
  });

  it("pointercancel ends the contact once; later events of that pointer are ignored", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at());
    controller.pointerMove(at());
    controller.pointerCancel(1, at());
    controller.pointerCancel(1, at()); // duplicate
    controller.pointerMove(at());
    controller.pointerUp(at());
    expect(types(recorder)).toEqual(["pointerdown", "pointermove", "pointercancel"]);
    expect(controller.isPressed).toBe(false);
  });

  it("ignores a second pointer while one is pressed; moves only count during a press", () => {
    const { controller, recorder } = setup();
    controller.pointerMove(at()); // hover: not recorded
    controller.pointerDown(at(1, "touch"));
    controller.pointerDown(at(2, "touch"));
    controller.pointerMove(at(2, "touch"));
    controller.pointerUp(at(2, "touch"));
    expect(types(recorder)).toEqual(["pointerdown"]);
    controller.pointerUp(at(1, "touch"));
    expect(types(recorder)).toEqual(["pointerdown", "pointerup"]);
  });

  it("toggling: check submits, uncheck clears, check again submits again; activations accumulate", () => {
    const { controller, recorder, submits, clears, tick } = setup();
    const press = () => { controller.pointerDown(at()); tick(20); controller.pointerUp(at()); tick(200); };
    press(); controller.change(true);
    press(); controller.change(false);
    press(); controller.change(true);
    expect(submits).toHaveLength(2);
    expect(clears()).toBe(1);
    const f = registry.get("checkbox").extractFeatures(challenge, recorder.snapshot()).features;
    expect(f).toMatchObject({ activationCount: 3, successfulActivationIndex: 3 });
  });

  it("a change with no input events (assistive technology) still submits; features show no activation", () => {
    const { controller, recorder, submits } = setup();
    controller.change(true);
    expect(submits).toEqual([{ checked: true }]);
    const f = registry.get("checkbox").extractFeatures(challenge, recorder.snapshot()).features;
    expect(f).toMatchObject({ activationCount: 0, reactionTime: null, inputModality: "none" });
  });

  it("dispose stops everything; activate (StrictMode) restores it; nothing leaks from before", () => {
    const { controller, recorder, submits } = setup();
    controller.pointerDown(at());
    controller.dispose();
    controller.pointerUp(at());
    controller.keyDown("Space", false);
    controller.change(true);
    expect(submits).toHaveLength(0);
    expect(types(recorder)).toEqual(["pointerdown"]);
    controller.activate();
    controller.pointerUp(at()); // the old press was dropped by dispose
    expect(types(recorder)).toEqual(["pointerdown"]);
    controller.keyDown("Space", false);
    expect(types(recorder)).toEqual(["pointerdown", "keydown"]);
  });

  it("a stale controller from a previous challenge records into its own recorder only", () => {
    const a = setup();
    const b = setup();
    a.controller.pointerDown(at());
    a.controller.dispose(); // what unmounting the old session does
    b.controller.pointerDown(at());
    expect(types(a.recorder)).toEqual(["pointerdown"]);
    expect(types(b.recorder)).toEqual(["pointerdown"]);
    a.controller.pointerUp(at());
    expect(types(a.recorder)).toEqual(["pointerdown"]);
    expect(types(b.recorder)).toEqual(["pointerdown"]);
  });
});
