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
  CHECKBOX_TARGETS,
  checkboxPlugin,
  extractCheckboxActivations,
  extractCheckboxFeatures,
  generateCheckboxChallenge,
  verifyCheckboxAnswer,
  type CheckboxChallenge,
} from "../index";

const C: string = CHECKBOX_TARGETS.control;
const challenge: CheckboxChallenge = { id: "c", expectedChecked: true };

type PKind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
const p = (
  t: number,
  type: PKind,
  o: { id?: number; target?: string; pointerType?: PointerType } = {},
): InteractionEvent => ({
  t, type, x: 10, y: 10, pointerId: o.id ?? 1, pointerType: o.pointerType ?? "mouse", target: o.target ?? C,
});
const k = (t: number, type: "keydown" | "keyup", code = "Space", target = C): InteractionEvent => ({ t, type, code, target });

function session(events: InteractionEvent[], durationMs?: number): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "checkbox", startedAt: 0,
    durationMs: durationMs ?? events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  };
}
const f = (events: InteractionEvent[], durationMs?: number) => extractCheckboxFeatures(session(events, durationMs)).features;

describe("generator", () => {
  it("is stable per seed, valid, and different across seeds", () => {
    const a = generateCheckboxChallenge({ rng: createRng(5) });
    expect(generateCheckboxChallenge({ rng: createRng(5) })).toEqual(a);
    expect(a.expectedChecked).toBe(true);
    expect(a.id).toMatch(/^checkbox-[0-9a-f]{8}$/);
    expect(generateCheckboxChallenge({ rng: createRng(6) }).id).not.toBe(a.id);
    expect(generateCheckboxChallenge({ rng: () => 0 }).id).toBe("checkbox-00000000");
  });
});

describe("verifier", () => {
  it("checked=true passes, false fails", () => {
    expect(verifyCheckboxAnswer(challenge, { checked: true }).passed).toBe(true);
    expect(verifyCheckboxAnswer(challenge, { checked: false }).passed).toBe(false);
  });

  it("malformed answers and challenges fail without throwing", () => {
    for (const a of [undefined, null, {}, { checked: "true" }, { checked: 1 }, 5]) {
      expect(verifyCheckboxAnswer(challenge, a as never).passed).toBe(false);
    }
    for (const c of [undefined, null, 5, "x", {}, { expectedChecked: "yes" }]) {
      expect(verifyCheckboxAnswer(c as never, { checked: true }).passed).toBe(false);
    }
  });

  it("ignores the interaction: behavior never decides pass/fail", () => {
    const empty = session([]);
    const busy = session([p(0, "pointerdown"), p(5, "pointerup")]);
    expect(checkboxPlugin.verify(challenge, { checked: true }, empty)).toEqual(
      checkboxPlugin.verify(challenge, { checked: true }, busy),
    );
  });
});

describe("activations", () => {
  it("pointer press/release is one completed activation", () => {
    const a = extractCheckboxActivations(session([p(10, "pointerdown"), p(15, "pointermove"), p(90, "pointerup")]));
    expect(a).toEqual([
      expect.objectContaining({ input: "pointer", pointerType: "mouse", pressT: 10, endT: 90, end: "up", completed: true }),
    ]);
  });

  it("pointercancel, interruption and a missing release are not completed", () => {
    const a = extractCheckboxActivations(session([
      p(0, "pointerdown"), p(10, "pointercancel"),
      p(20, "pointerdown"), p(30, "pointerdown"), // second press without release interrupts the first
      p(40, "pointerup"),
      p(50, "pointerdown"), // never released
    ]));
    expect(a.map((x) => [x.end, x.completed])).toEqual([
      ["cancel", false], ["interrupted", false], ["up", true], ["open", false],
    ]);
  });

  it("keyboard keydown/keyup of Space is an activation; other keys, targets and a lone keyup are ignored", () => {
    const a = extractCheckboxActivations(session([
      k(1, "keyup"), // no matching keydown
      k(5, "keydown", "Enter"), k(6, "keyup", "Enter"),
      k(7, "keydown", "Space", "other-target"), k(8, "keyup", "Space", "other-target"),
      k(10, "keydown"), k(60, "keyup"),
    ]));
    expect(a).toEqual([expect.objectContaining({ input: "keyboard", pressT: 10, endT: 60, completed: true })]);
  });

  it("auto-repeat keydown keeps the original press time (physical hold duration)", () => {
    const a = extractCheckboxActivations(session([k(0, "keydown"), k(100, "keydown"), k(150, "keydown"), k(200, "keyup")]));
    expect(a).toEqual([expect.objectContaining({ pressT: 0, endT: 200, completed: true })]);
    expect(f([k(0, "keydown"), k(100, "keydown"), k(200, "keyup")]).pressDuration).toBe(200);
  });

  it("keydown without keyup stays open; a Space event on another target ends a pending press", () => {
    const open = extractCheckboxActivations(session([k(0, "keydown"), k(30, "keydown")]));
    expect(open.map((x) => [x.end, x.completed])).toEqual([["open", false]]);
    const off = extractCheckboxActivations(session([
      k(0, "keydown"), k(50, "keyup", "Space", "other"), k(500, "keyup"),
    ]));
    expect(off.map((x) => [x.end, x.completed, x.endT, x.endIndex])).toEqual([["interrupted", false, 0, 0]]);
    const unrelatedKey = extractCheckboxActivations(session([k(0, "keydown"), k(5, "keydown", "KeyA"), k(9, "keyup")]));
    expect(unrelatedKey.map((x) => x.completed)).toEqual([true]);
  });

  it("pointer release recorded off the control is not an activation; down off / up on is ignored", () => {
    const a = extractCheckboxActivations(session([
      p(0, "pointerdown"), p(10, "pointermove"), p(20, "pointerup", { target: "elsewhere" }),
      p(30, "pointerdown", { target: "elsewhere", id: 2 }), p(40, "pointerup", { id: 2 }),
    ]));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ completed: false, end: "cancel" });
  });

  it("orders mixed activations by release time, ties by event order", () => {
    const a = extractCheckboxActivations(session([
      k(0, "keydown"), p(5, "pointerdown"), p(50, "pointerup"), k(50, "keyup"),
    ]));
    expect(a.map((x) => x.input)).toEqual(["pointer", "keyboard"]); // both end at 50; pointerup comes first in order
  });
});

describe("checkbox features", () => {
  it("pointer activation: timing, count, successful index, press duration", () => {
    const x = f([p(120, "pointermove"), p(200, "pointerdown"), p(260, "pointerup")]);
    expect(x).toMatchObject({
      reactionTime: 200, // hover before the press does not count
      timeToFirstActivation: 260,
      activationCount: 1,
      successfulActivationIndex: 1,
      pressDuration: 60,
      interActivationTime: null,
      inputModality: "mouse",
      eventCount: 3,
      completionTime: 260,
    });
  });

  it("keyboard activation is equivalent: Space down/up", () => {
    const x = f([k(300, "keydown"), k(380, "keyup")]);
    expect(x).toMatchObject({
      reactionTime: 300, timeToFirstActivation: 380, activationCount: 1,
      successfulActivationIndex: 1, pressDuration: 80, inputModality: "keyboard",
    });
  });

  it("touch and pen pointer types are reported as their modality", () => {
    expect(f([p(0, "pointerdown", { pointerType: "touch" }), p(40, "pointerup", { pointerType: "touch" })]).inputModality).toBe("touch");
    expect(f([p(0, "pointerdown", { pointerType: "pen" }), p(40, "pointerup", { pointerType: "pen" })]).inputModality).toBe("pen");
  });

  it("repeated toggles: parity decides the final state; success is the last activation when it ends checked", () => {
    const three = f([
      p(0, "pointerdown"), p(10, "pointerup"),
      p(100, "pointerdown"), p(130, "pointerup"),
      p(400, "pointerdown"), p(450, "pointerup"),
    ]);
    expect(three).toMatchObject({
      activationCount: 3, successfulActivationIndex: 3, pressDuration: 50,
      timeToFirstActivation: 10, interActivationTime: (450 - 10) / 2,
    });
    const two = f([p(0, "pointerdown"), p(10, "pointerup"), p(100, "pointerdown"), p(130, "pointerup")]);
    expect(two).toMatchObject({ activationCount: 2, successfulActivationIndex: null, pressDuration: null, interActivationTime: 120 });
  });

  it("pointercancel is not a successful activation, but its press counts as intent", () => {
    const x = f([p(50, "pointerdown"), p(70, "pointercancel")]);
    expect(x).toMatchObject({
      reactionTime: 50, timeToFirstActivation: null, activationCount: 0,
      successfulActivationIndex: null, pressDuration: null,
    });
  });

  it("features follow the events, not the verified answer (documented divergence)", () => {
    const evs = [p(0, "pointerdown"), p(10, "pointerup")];
    expect(f(evs).successfulActivationIndex).toBe(1);
    expect(verifyCheckboxAnswer(challenge, { checked: false }).passed).toBe(false);
    expect(verifyCheckboxAnswer(challenge, { checked: true }).passed).toBe(true);
    expect(f([]).successfulActivationIndex).toBeNull();
  });

  it("equal release times keep session event order for ordering and pressDuration", () => {
    const two = f([
      p(0, "pointerdown", { id: 1 }), p(0, "pointerdown", { id: 2 }), p(100, "pointerup", { id: 1 }),
      p(100, "pointerup", { id: 2 }),
    ]);
    expect(two.activationCount).toBe(2);
    expect(two.successfulActivationIndex).toBeNull();
    const three = f([
      p(0, "pointerdown", { id: 1 }), p(0, "pointerdown", { id: 2 }), p(0, "pointerdown", { id: 3 }),
      p(100, "pointerup", { id: 1 }), p(100, "pointerup", { id: 2 }), p(100, "pointerup", { id: 3 }),
    ]);
    expect(three).toMatchObject({ activationCount: 3, successfulActivationIndex: 3, pressDuration: 100 });
  });

  it("unrelated-target events do not change activation features but do affect inputModality", () => {
    const x = f([k(0, "keydown"), k(20, "keyup"), p(50, "pointermove", { target: "elsewhere" })]);
    expect(x).toMatchObject({ activationCount: 1, inputModality: "mixed" });
  });

  it("keydown without keyup: intent but no activation", () => {
    expect(f([k(10, "keydown")])).toMatchObject({ reactionTime: 10, activationCount: 0, successfulActivationIndex: null });
  });

  it("unrelated targets are ignored", () => {
    const x = f([p(0, "pointerdown", { target: "elsewhere" }), p(9, "pointerup", { target: "elsewhere" })]);
    expect(x).toMatchObject({ reactionTime: null, activationCount: 0, eventCount: 2 });
  });

  it("no events or hover-only: unavailable values are null, never 0", () => {
    const none = f([], 0);
    expect(none).toMatchObject({
      reactionTime: null, timeToFirstActivation: null, activationCount: 0,
      successfulActivationIndex: null, pressDuration: null, interActivationTime: null, inputModality: "none",
    });
    expect(f([p(5, "pointermove")]).reactionTime).toBeNull();
  });

  it("duplicate timestamps keep working (zero press duration, stable ordering)", () => {
    const x = f([p(10, "pointerdown"), p(10, "pointerup")]);
    expect(x).toMatchObject({ pressDuration: 0, timeToFirstActivation: 10, reactionTime: 10 });
    expect(Object.values(x).every((v) => v === null || typeof v === "string" || Number.isFinite(v))).toBe(true);
  });

  it("mixed input is reported as mixed and both kinds count", () => {
    const x = f([p(0, "pointerdown"), p(20, "pointerup"), k(100, "keydown"), k(130, "keyup")]);
    expect(x).toMatchObject({ inputModality: "mixed", activationCount: 2, interActivationTime: 110 });
  });

  it("touchstart counts as press intent for reactionTime", () => {
    const touch: InteractionEvent = { t: 7, type: "touchstart", x: 1, y: 1, pointerId: 3, pointerType: "touch", target: C };
    expect(f([touch]).reactionTime).toBe(7);
  });
});

describe("golden: definitions must not change silently", () => {
  const set = extractCheckboxFeatures(session([
    p(40, "pointermove"), p(200, "pointerdown"), p(260, "pointerup"),
    p(900, "pointerdown"), p(950, "pointerup"), p(1500, "pointerdown"), p(1580, "pointerup"),
  ]));

  it("pins versions", () => {
    expect(set.schemaVersion).toBe("checkbox@1");
    expect(set.extractorVersion).toBe("checkbox@1");
  });

  it("pins values", () => {
    expect(set.features).toEqual({
      completionTime: 1580,
      eventCount: 7,
      reactionTime: 200,
      timeToFirstActivation: 260,
      activationCount: 3,
      successfulActivationIndex: 3,
      pressDuration: 80,
      interActivationTime: 660,
      inputModality: "mouse",
    });
  });
});
