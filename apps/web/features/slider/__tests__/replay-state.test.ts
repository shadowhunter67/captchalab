import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createPointerTimeline,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import type { SliderLayout } from "@captchalab/captcha-plugins";
import { createHandleReplay } from "../replay-state";

const layout: SliderLayout = { trackLeft: 0, trackWidth: 340, handleWidth: 40 }; // travel 300
const H = "slider-handle";
const ev = (
  t: number,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  u: number,
  target = H,
): InteractionEvent => ({ t, type, x: u + 20, y: 10, pointerId: 1, pointerType: "mouse", target });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "slider", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: "mouse",
});
const replay = (events: InteractionEvent[]) => {
  const s = session(events);
  return createHandleReplay(s, createPointerTimeline(s), layout, H);
};

describe("handle replay state", () => {
  it("hover does not move the handle; a drag does; release holds the final position", () => {
    const at = replay([
      ev(0, "pointermove", 100, "slider-track"),
      ev(100, "pointermove", 200, "slider-track"),
      ev(200, "pointerdown", 200),
      ev(300, "pointermove", 250),
      ev(400, "pointerup", 250),
    ]);
    expect(at(0)).toBe(0);
    expect(at(150)).toBe(0); // hovering
    expect(at(200)).toBe(200);
    expect(at(350)).toBe(250);
    expect(at(999)).toBe(250);
  });

  it("a cancelled drag returns the handle to 0", () => {
    const at = replay([ev(0, "pointerdown", 0), ev(100, "pointermove", 120), ev(200, "pointercancel", 120)]);
    expect(at(100)).toBe(120);
    expect(at(300)).toBe(0);
  });

  it("a later attempt overrides an earlier release", () => {
    const at = replay([
      ev(0, "pointerdown", 0), ev(100, "pointerup", 200),
      ev(500, "pointerdown", 10), ev(600, "pointermove", 60), ev(700, "pointerup", 60),
    ]);
    expect(at(300)).toBe(200);
    expect(at(600)).toBe(60);
    expect(at(800)).toBe(60);
  });

  it("clamps to the handle travel", () => {
    const at = replay([ev(0, "pointerdown", 0), ev(100, "pointerup", 900)]);
    expect(at(200)).toBe(300);
  });
});
