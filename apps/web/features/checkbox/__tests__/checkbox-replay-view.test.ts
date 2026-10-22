import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, inferModality, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import type { CheckboxFeatures } from "@captchalab/captcha-plugins";
import { formatMetricValue } from "@/lib/inspect/metrics";
import { createCheckboxReplay } from "../checkbox-replay-state";
import { checkboxActivationMetrics, checkboxSessionMetrics } from "../checkbox-view-data";

const C = "checkbox-control";
const p = (t: number, type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel", x = 20, id = 1): InteractionEvent => ({
  t, type, x, y: 10, pointerId: id, pointerType: "mouse", target: C,
});
const k = (t: number, type: "keydown" | "keyup"): InteractionEvent => ({ t, type, code: "Space", target: C });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "checkbox", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});

describe("checkbox replay model", () => {
  it("pointer: unchecked -> pressed -> checked, with a virtual pointer only during the recording", () => {
    const m = createCheckboxReplay(session([p(100, "pointerdown", 20), p(150, "pointermove", 30), p(200, "pointerup", 40)]));
    expect(m.range).toEqual([100, 200]);
    expect(m.at(50)).toEqual({ checked: false, pointerPressed: false, keyPressed: false, pointer: null });
    expect(m.at(100)).toMatchObject({ checked: false, pointerPressed: true, keyPressed: false, pointer: { x: 20, y: 10 } });
    expect(m.at(175)).toMatchObject({ pointerPressed: true, pointer: { x: 35, y: 10 } }); // interpolated
    expect(m.at(200)).toMatchObject({ checked: true, pointerPressed: false, keyPressed: false });
    expect(m.at(999)).toMatchObject({ checked: true, pointer: null });
  });

  it("keyboard: key held then checked; no pointer is shown", () => {
    const m = createCheckboxReplay(session([k(300, "keydown"), k(380, "keyup")]));
    expect(m.at(310)).toMatchObject({ checked: false, pointerPressed: false, keyPressed: true, pointer: null });
    expect(m.at(380)).toMatchObject({ checked: true, keyPressed: false });
  });

  it("toggling: checked follows completed activations; a cancelled press does not toggle", () => {
    const m = createCheckboxReplay(session([
      p(0, "pointerdown"), p(10, "pointerup"),
      p(100, "pointerdown"), p(110, "pointercancel"),
      p(200, "pointerdown"), p(210, "pointerup"),
      p(300, "pointerdown"), p(310, "pointerup"),
    ]));
    expect([m.at(20).checked, m.at(105).checked, m.at(120).checked, m.at(215).checked, m.at(320).checked]).toEqual([
      true, true, true, false, true,
    ]);
    expect(m.at(105).pointerPressed).toBe(true); // the cancelled press is drawn while held
    expect(m.at(115).pointerPressed).toBe(false);
  });

  it("a pointer press and a Space hold overlap independently", () => {
    const m = createCheckboxReplay(session([p(0, "pointerdown"), k(10, "keydown"), p(30, "pointerup"), k(50, "keyup")]));
    expect(m.at(20)).toMatchObject({ pointerPressed: true, keyPressed: true });
    expect(m.at(40)).toMatchObject({ pointerPressed: false, keyPressed: true });
  });

  it("an unfinished press stays pressed; equal timestamps and empty sessions do not break", () => {
    expect(createCheckboxReplay(session([p(0, "pointerdown")])).at(500)).toMatchObject({ pointerPressed: true, checked: false });
    const same = createCheckboxReplay(session([p(7, "pointerdown"), p(7, "pointerup")]));
    expect(same.range).toEqual([7, 8]);
    const none = createCheckboxReplay(session([]));
    expect(none.range).toBeNull();
    expect(none.at(0)).toEqual({ checked: false, pointerPressed: false, keyPressed: false, pointer: null });
  });
});

describe("checkbox metric descriptors", () => {
  const f: CheckboxFeatures = {
    completionTime: 1280, eventCount: 4, reactionTime: 412.4, timeToFirstActivation: null,
    activationCount: 0, successfulActivationIndex: null, pressDuration: null, interActivationTime: null, inputModality: "keyboard",
  };

  it("shows raw values with units, a dash for unavailable ones (no fake zero), and text for modality", () => {
    const rows = [...checkboxActivationMetrics(f), ...checkboxSessionMetrics(f)];
    const shown = Object.fromEntries(rows.map((r) => [r.id, formatMetricValue(r)]));
    expect(shown).toMatchObject({
      reactionTime: "412 ms",
      timeToFirstActivation: "—",
      pressDuration: "—",
      activationCount: "0", // a real count, so 0 is truthful
      successfulActivationIndex: "—",
      interActivationTime: "—",
      inputModality: "keyboard",
      eventCount: "4",
      completionTime: "1.28 s",
    });
    const reaction = rows.find((r) => r.id === "reactionTime");
    expect(reaction && "value" in reaction ? reaction.value : undefined).toBe(412.4);
  });
});
