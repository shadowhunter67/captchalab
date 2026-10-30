import { describe, expect, it } from "vitest";
import { createEventRecorder, type Point } from "@captchalab/captcha-core";
import {
  deriveDragAttempts,
  extractDragDropFeatures,
  registry,
  type DragDropAnswer,
  type DragDropChallenge,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import type { PointerSample } from "@/lib/pointer-adapter";
import { analyzeSession } from "@/lib/behavior/analysis";
import { classify } from "@/lib/behavior/classifier";
import { DragDropController, type DragDropViewState } from "../drag-drop-controller";

const layout: DragDropLayout = { width: 400, height: 300 };
const challenge: DragDropChallenge = {
  id: "c",
  itemSize: 0.17,
  dropTolerance: 0.14,
  items: [
    { id: "item-a", kind: "circle", start: { x: 0.25, y: 0.8 } }, // (100, 240)
    { id: "item-b", kind: "square", start: { x: 0.75, y: 0.8 } }, // (300, 240)
  ],
  targets: [
    { id: "target-a", acceptsItemId: "item-a", position: { x: 0.25, y: 0.2 } }, // (100, 60)
    { id: "target-b", acceptsItemId: "item-b", position: { x: 0.75, y: 0.2 } }, // (300, 60)
  ],
};

function setup(opts: { layout?: DragDropLayout | null } = {}) {
  let clock = 0;
  const recorder = createEventRecorder({ captchaId: "drag-drop", now: () => clock });
  const positions: Record<string, Point> = {};
  const moves: [string, Point][] = [];
  const states: DragDropViewState[] = [];
  const verifies: DragDropAnswer[] = [];
  let resizedAfterInput = 0;
  const controller = new DragDropController({
    recorder, challenge,
    onItemPosition: (id, c) => { positions[id] = c; moves.push([id, c]); },
    onState: (s) => states.push(s),
    onVerify: (a) => verifies.push(a),
    onLayoutChangedAfterInput: () => void resizedAfterInput++,
  });
  const released: number[] = [];
  controller.releasePointer = (id) => released.push(id);
  if (opts.layout !== null) controller.setLayout(opts.layout ?? layout);
  return {
    controller, recorder, positions, moves, states, verifies, released,
    resized: () => resizedAfterInput, last: () => states[states.length - 1] as DragDropViewState,
    tick: (ms: number) => { clock += ms; },
  };
}
const at = (x: number, y: number, id = 1, type: PointerSample["pointerType"] = "mouse"): PointerSample => ({ x, y, pointerId: id, pointerType: type });
const types = (r: { snapshot(): { events: readonly { type: string }[] } }) => r.snapshot().events.map((e) => e.type);

describe("DragDropController", () => {
  it("paints items at their start centers when the layout arrives", () => {
    const { positions, last } = setup();
    expect(positions["item-a"]).toEqual({ x: 100, y: 240 });
    expect(positions["item-b"]).toEqual({ x: 300, y: 240 });
    expect(last()).toMatchObject({ ready: true, activeItemId: null, allPlaced: false });
  });

  it("pointerdown lifts the item, preserves the grab offset (no snap to the pointer) and records the semantic target", () => {
    const { controller, recorder, positions, last } = setup();
    expect(controller.pointerDown(at(115, 250), "item-a")).toBe(true); // grabbed 15px right, 10px below the center
    expect(last().activeItemId).toBe("item-a");
    controller.pointerMove(at(215, 150));
    expect(positions["item-a"]).toEqual({ x: 200, y: 140 }); // pointer - offset, not the pointer itself
    const ev = recorder.snapshot().events;
    expect(ev.map((e) => [e.type, e.target])).toEqual([["pointerdown", "drag-item:item-a"], ["pointermove", "drag-item:item-a"]]);
    expect(ev.every((e) => "pointerId" in e && e.pointerId === 1)).toBe(true);
  });

  it("successful drop snaps onto the target; a held item shows as unplaced until then", () => {
    const { controller, positions, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    expect(last().placements["item-a"]).toBeNull();
    controller.pointerMove(at(104, 66));
    expect(controller.pointerUp(at(104, 66))).toBe(true);
    expect(positions["item-a"]).toEqual({ x: 100, y: 60 }); // snapped to the target center
    expect(last()).toMatchObject({ activeItemId: null, placements: { "item-a": "target-a", "item-b": null }, lastDrop: { outcome: "correct", targetId: "target-a" } });
  });

  it("failed drop returns the item to where it was before the drag", () => {
    const { controller, positions, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerMove(at(200, 150));
    controller.pointerUp(at(200, 150));
    expect(positions["item-a"]).toEqual({ x: 100, y: 240 });
    expect(last()).toMatchObject({ placements: { "item-a": null }, lastDrop: { outcome: "miss", targetId: null } });
  });

  it("wrong-target drop stays on that target (placement recorded as wrong)", () => {
    const { controller, positions, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerUp(at(300, 60));
    expect(positions["item-a"]).toEqual({ x: 300, y: 60 });
    expect(last()).toMatchObject({ placements: { "item-a": "target-b" }, lastDrop: { outcome: "wrong-target" } });
  });

  it("dropping on an occupied area sends the occupant back to its start and repaints it", () => {
    const { controller, positions, last } = setup();
    controller.pointerDown(at(300, 240), "item-b");
    controller.pointerUp(at(300, 60)); // b correct
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerUp(at(300, 60)); // a onto b's area
    expect(last()).toMatchObject({
      placements: { "item-a": "target-b", "item-b": null },
      lastDrop: { itemId: "item-a", outcome: "wrong-target", bumpedItemId: "item-b" },
    });
    expect(positions["item-b"]).toEqual({ x: 300, y: 240 }); // b is back at its start
    expect(positions["item-a"]).toEqual({ x: 300, y: 60 });
  });

  it("re-dragging a placed item lifts it from its target and a failed drop puts it back", () => {
    const { controller, positions, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerUp(at(100, 60));
    expect(controller.pointerDown(at(100, 60), "item-a")).toBe(true);
    expect(last().placements["item-a"]).toBeNull(); // in the air
    controller.pointerUp(at(250, 150)); // miss
    expect(positions["item-a"]).toEqual({ x: 100, y: 60 });
    expect(last().placements["item-a"]).toBe("target-a");
  });

  it("clamps the held item to the surface", () => {
    const { controller, positions } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerMove(at(-500, 900));
    expect(positions["item-a"]).toEqual({ x: 0, y: 300 });
  });

  it("pointercancel records a cancel, returns the item and never drops", () => {
    const { controller, recorder, positions, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerMove(at(100, 100));
    controller.pointerCancel(1, at(100, 100));
    expect(types(recorder)).toEqual(["pointerdown", "pointermove", "pointercancel"]);
    expect(positions["item-a"]).toEqual({ x: 100, y: 240 });
    expect(last()).toMatchObject({ activeItemId: null, lastDrop: null, placements: { "item-a": null } });
    expect(controller.pointerUp(at(100, 60))).toBe(false); // nothing left to release
  });

  it("lost capture aborts safely and the still-down pointer is ignored until it is released", () => {
    const { controller, recorder, released } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.lostCapture(1, at(120, 200));
    expect(released).toEqual([1]);
    expect(types(recorder)).toEqual(["pointerdown", "pointercancel"]);
    controller.pointerMove(at(100, 100)); // the button is still held: ignored, not recorded
    expect(controller.pointerUp(at(100, 60))).toBe(false);
    expect(types(recorder)).toEqual(["pointerdown", "pointercancel"]);
    expect(controller.pointerDown(at(100, 240), "item-a")).toBe(true); // a fresh press works
  });

  it("a resize during a drag cancels it, releases capture and returns the item; a resize while idle just repaints", () => {
    const { controller, recorder, positions, released, resized } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.setLayout({ width: 800, height: 600 });
    expect(types(recorder)).toEqual(["pointerdown", "pointercancel"]);
    expect(released).toEqual([1]);
    expect(controller.isDragging).toBe(false);
    expect(positions["item-a"]).toEqual({ x: 200, y: 480 }); // 0.25/0.8 of the NEW size
    expect(resized()).toBe(1);
    expect(controller.pointerUp(at(1, 1))).toBe(false); // stale pointer ignored
    controller.setLayout({ width: 400, height: 300 });
    expect(positions["item-b"]).toEqual({ x: 300, y: 240 });
  });

  it("an unchanged layout does not cancel a drag; an invalid or missing one disables interaction", () => {
    const { controller, last } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.setLayout({ ...layout });
    expect(controller.isDragging).toBe(true);
    controller.setLayout({ width: 0, height: 300 });
    expect(controller.isDragging).toBe(false);
    expect(last().ready).toBe(false);
    expect(controller.pointerDown(at(1, 1), "item-a")).toBe(false);
    controller.setLayout(null);
    expect(last().ready).toBe(false);
    controller.setLayout(layout);
    expect(last().ready).toBe(true);
  });

  it("ignores a second pointer, unknown items, and presses before a layout exists", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(100, 240, 1), "item-a");
    expect(controller.pointerDown(at(300, 240, 2, "touch"), "item-b")).toBe(false);
    controller.pointerMove(at(300, 100, 2, "touch"));
    expect(controller.pointerUp(at(300, 60, 2, "touch"))).toBe(false);
    expect(types(recorder)).toEqual(["pointerdown"]);
    expect(setup().controller.pointerDown(at(1, 1), "ghost")).toBe(false);
    expect(setup({ layout: null }).controller.pointerDown(at(100, 240), "item-a")).toBe(false);
  });

  it("verify is only possible when every item is placed and nothing is held", () => {
    const { controller, verifies } = setup();
    controller.verify();
    controller.pointerDown(at(100, 240), "item-a");
    controller.pointerUp(at(100, 60));
    controller.verify();
    controller.pointerDown(at(300, 240), "item-b");
    controller.verify(); // held
    controller.pointerUp(at(300, 60));
    expect(verifies).toHaveLength(0);
    controller.verify();
    expect(verifies).toEqual([{ placements: { "item-a": "target-a", "item-b": "target-b" } }]);
  });

  it("dispose stops everything; activate (StrictMode) restores it", () => {
    const { controller, recorder } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.dispose();
    controller.pointerMove(at(100, 100));
    expect(controller.pointerUp(at(100, 60))).toBe(false);
    expect(types(recorder)).toEqual(["pointerdown"]);
    controller.activate();
    expect(controller.pointerDown(at(100, 240), "item-a")).toBe(true); // the dropped drag did not linger
  });

  it("disposing during a drag releases the captured pointer", () => {
    const { controller, released } = setup();
    controller.pointerDown(at(100, 240), "item-a");
    controller.dispose();
    expect(released).toEqual([1]);
  });

  it("a stale controller from a previous challenge cannot touch a new one", () => {
    const a = setup();
    const b = setup();
    a.controller.pointerDown(at(100, 240), "item-a");
    a.controller.dispose();
    b.controller.pointerDown(at(100, 240), "item-a");
    a.controller.pointerUp(at(100, 60));
    expect(types(a.recorder)).toEqual(["pointerdown"]);
    expect(types(b.recorder)).toEqual(["pointerdown"]);
    expect(b.last().activeItemId).toBe("item-a");
  });

  it("the UI controller and the feature extractor agree: replaying the recording reproduces the same final state", () => {
    const { controller, recorder, tick } = setup();
    const drag = (item: string, from: [number, number], to: [number, number], offset: [number, number] = [0, 0]) => {
      controller.pointerDown(at(from[0] + offset[0], from[1] + offset[1]), item);
      tick(50);
      controller.pointerMove(at((from[0] + to[0]) / 2 + offset[0], (from[1] + to[1]) / 2 + offset[1]));
      tick(50);
      controller.pointerUp(at(to[0] + offset[0], to[1] + offset[1]));
      tick(100);
    };
    drag("item-a", [100, 240], [300, 60], [8, -6]); // wrong target, grabbed off-center
    drag("item-b", [300, 240], [210, 160]); // miss
    drag("item-b", [300, 240], [300, 60]); // takes target-b: item-a goes back to its start; correct
    drag("item-a", [100, 240], [100, 60], [-5, 4]); // item-a to its own target: correct
    controller.pointerDown(at(300, 60), "item-b");
    controller.pointerCancel(1, at(300, 60)); // cancelled lift
    const session = recorder.snapshot();
    const { attempts, finalState } = deriveDragAttempts(challenge, layout, session);
    expect(attempts.map((a) => a.outcome)).toEqual(["wrong-target", "miss", "correct", "correct", "cancelled"]);
    expect(finalState.placements).toEqual({ "item-a": "target-a", "item-b": "target-b" });
    const set = registry.get("drag-drop").extractFeatures(challenge, session, { layout });
    expect(set.features).toMatchObject({ successfulDropCount: 2, failedDropCount: 2, cancelledDragCount: 1, numberOfDragAttempts: 5 });
    expect(extractDragDropFeatures(challenge, session, { layout }).features.timeToAllCorrect).not.toBeNull();
  });
});

describe("DragDropController: keyboard input", () => {
  it("select, then place on the matching area: same rule and answer as a drag; selection is cleared", () => {
    const { controller, last, verifies } = setup();
    controller.keySelect("item-a", "Enter");
    expect(last()).toMatchObject({ selectedItemId: "item-a", keyNotice: "selected", activeItemId: null });
    controller.keyPlace("target-a", "Space");
    expect(last().selectedItemId).toBeNull();
    expect(last().placements["item-a"]).toBe("target-a");
    expect(last().lastDrop).toMatchObject({ itemId: "item-a", outcome: "correct", targetId: "target-a", bumpedItemId: null });
    controller.keySelect("item-b", "Enter");
    controller.keyPlace("target-b", "Enter");
    expect(last().allPlaced).toBe(true);
    controller.verify();
    expect(verifies[0]).toEqual({ placements: { "item-a": "target-a", "item-b": "target-b" } });
  });

  it("a wrong area is a wrong-target outcome; an occupied area sends its shape back; a placed shape can be moved", () => {
    const { controller, last, positions } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-b", "Enter");
    expect(last().lastDrop).toMatchObject({ outcome: "wrong-target", targetId: "target-b" });
    controller.keySelect("item-b", "Enter");
    controller.keyPlace("target-b", "Enter");
    expect(last().lastDrop).toMatchObject({ outcome: "correct", bumpedItemId: "item-a" });
    expect(last().placements).toEqual({ "item-a": null, "item-b": "target-b" });
    expect(positions["item-a"]).toEqual({ x: 100, y: 240 }); // back at its start
    controller.keySelect("item-b", "Enter"); // correction: pick the placed shape up again
    controller.keyPlace("target-a", "Enter");
    expect(last().placements).toEqual({ "item-a": null, "item-b": "target-a" });
  });

  it("selecting the same shape again, or Escape, unselects without touching placements", () => {
    const { controller, last } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keySelect("item-a", "Enter");
    expect(last()).toMatchObject({ selectedItemId: null, keyNotice: "deselected" });
    controller.keySelect("item-b", "Space");
    controller.keyCancel("Escape");
    expect(last()).toMatchObject({ selectedItemId: null, keyNotice: "deselected" });
    expect(last().placements).toEqual({ "item-a": null, "item-b": null });
    controller.keyCancel("Escape"); // nothing selected: nothing happens
    expect(last().keyNotice).toBe("deselected");
  });

  it("a drop area with nothing selected places nothing and says why", () => {
    const { controller, last } = setup();
    controller.keyPlace("target-a", "Enter");
    expect(last()).toMatchObject({ keyNotice: "needs-selection", selectedItemId: null });
    expect(last().placements).toEqual({ "item-a": null, "item-b": null });
  });

  it("records only control keys with semantic targets, never anything typed", () => {
    const { controller, recorder } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-a", "Space");
    controller.keySelect("item-b", "Space");
    controller.keyCancel("Escape");
    expect(recorder.snapshot().events).toEqual([
      expect.objectContaining({ type: "keydown", code: "Enter", target: "drag-item:item-a" }),
      expect.objectContaining({ type: "keydown", code: "Space", target: "drop-target:target-a" }),
      expect.objectContaining({ type: "keydown", code: "Space", target: "drag-item:item-b" }),
      expect.objectContaining({ type: "keydown", code: "Escape", target: "drag-item:item-b" }),
    ]);
    expect(recorder.snapshot().inputModality).toBe("keyboard");
  });

  it("is ignored while a pointer drag is active, and a pointer drag clears a pending selection", () => {
    const { controller, last, recorder } = setup();
    controller.keySelect("item-a", "Enter");
    expect(controller.pointerDown(at(300, 240), "item-b")).toBe(true);
    expect(last().selectedItemId).toBeNull();
    const before = recorder.size;
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-a", "Enter");
    expect(recorder.size).toBe(before);
    expect(last().placements["item-a"]).toBeNull();
  });

  it("does nothing without a measurable layout, for an unknown id, or after dispose", () => {
    const noLayout = setup({ layout: null });
    noLayout.controller.keySelect("item-a", "Enter");
    expect(noLayout.states.at(-1)?.selectedItemId ?? null).toBeNull();
    const s = setup();
    s.controller.keySelect("nope", "Enter");
    s.controller.keyPlace("nope", "Enter");
    expect(s.recorder.size).toBe(0);
    s.controller.dispose();
    s.controller.keySelect("item-a", "Enter");
    expect(s.recorder.size).toBe(0);
  });

  it("the feature extractor accepts a keyboard-only session: modality keyboard, no drag attempts, nothing thrown", () => {
    const { controller, recorder } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-a", "Enter");
    const session = recorder.snapshot();
    const f = extractDragDropFeatures(challenge, session, { layout }).features;
    expect(f.inputModality).toBe("keyboard");
    expect(f.numberOfDragAttempts).toBe(0);
    expect(deriveDragAttempts(challenge, layout, session).attempts).toEqual([]);
  });

  it("the Behavioral Lab reads a keyboard-only drag & drop session without throwing: pointer signals are missing, not zero", () => {
    const { controller, recorder } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-a", "Enter");
    controller.keySelect("item-b", "Enter");
    controller.keyPlace("target-b", "Enter");
    const vector = analyzeSession("drag-drop", challenge, recorder.snapshot(), layout);
    expect(vector.inputModality).toBe("keyboard");
    expect(vector.values.pointerDistance).toBeNull();
    expect(vector.values.meanVelocity).toBeNull();
    expect(["human-like", "synthetic-like", "uncertain"]).toContain(classify(vector).label);
  });

  it("cannot verify while a keyboard selection is pending, so a result never describes a board that is about to change", () => {
    const { controller, last, verifies } = setup();
    controller.keySelect("item-a", "Enter");
    controller.keyPlace("target-a", "Enter");
    controller.keySelect("item-b", "Enter");
    controller.keyPlace("target-b", "Enter");
    expect(last().allPlaced).toBe(true);
    controller.keySelect("item-a", "Enter"); // pick a placed shape up again
    expect(last().allPlaced).toBe(false);
    controller.verify();
    expect(verifies).toHaveLength(0);
    controller.keyCancel("Escape");
    expect(last().allPlaced).toBe(true);
    controller.verify();
    expect(verifies).toHaveLength(1);
  });
});
