import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createPointerTimeline,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import type { SliderLayout } from "@captchalab/captcha-plugins";
import type { SessionMarker } from "@/lib/replay/markers";
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
const reset = (t: number, position = 0): SessionMarker => ({ type: "attempt-reset", t, position });
const replay = (events: InteractionEvent[], markers: SessionMarker[] = []) => {
  const s = session(events);
  return createHandleReplay(s, createPointerTimeline(s), layout, H, markers);
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
    expect(at(150)).toBe(0);
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

  it("an attempt-reset marker snaps the handle back between two attempts", () => {
    const at = replay(
      [ev(0, "pointerdown", 0), ev(100, "pointerup", 200), ev(900, "pointerdown", 20), ev(1000, "pointerup", 150)],
      [reset(500)],
    );
    expect(at(300)).toBe(200); // released, not yet reset
    expect(at(499)).toBe(200);
    expect(at(500)).toBe(0); // reset
    expect(at(800)).toBe(0);
    expect(at(950)).toBeGreaterThan(0); // second drag follows the pointer
    expect(at(2000)).toBe(150);
  });

  it("reset ordering on equal timestamps: marker before a drag starting then, after a drag ending then", () => {
    const events = [ev(0, "pointerdown", 0), ev(100, "pointerup", 200), ev(500, "pointerdown", 40), ev(600, "pointerup", 80)];
    expect(replay(events, [reset(500)])(500)).toBe(40); // drag starts at 500: reset already applied
    expect(replay(events, [reset(100)])(100)).toBe(0); // drag ended at 100: the reset applies after it
  });

  it("two retries produce two resets; one-attempt sessions have none", () => {
    const events = [
      ev(0, "pointerdown", 0), ev(10, "pointerup", 100),
      ev(100, "pointerdown", 0), ev(110, "pointerup", 120),
      ev(200, "pointerdown", 0), ev(210, "pointerup", 140),
    ];
    const at = replay(events, [reset(50), reset(150)]);
    expect([at(20), at(60), at(120), at(160), at(220)]).toEqual([100, 0, 120, 0, 140]);
    const single = replay([ev(0, "pointerdown", 0), ev(10, "pointerup", 100)]);
    expect(single(500)).toBe(100);
  });

  it("no drags at all: the handle stays at 0 (or at a marker's position)", () => {
    expect(replay([])(10)).toBe(0);
    expect(replay([], [reset(5, 0.5)])(10)).toBe(150);
  });
});
