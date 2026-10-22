import {
  SLIDER_TARGETS,
  isValidSliderLayout,
  pointerXToPosition,
  type SliderAnswer,
  type SliderLayout,
} from "@captchalab/captcha-plugins";
import type { EventRecorder } from "@captchalab/captcha-core";
import { toRecorderEvent, type PointerSample } from "@/lib/pointer-adapter";

export type SubmitVia = "pointer" | "keyboard";

export type SliderPhase =
  /** Waiting for an attempt. */
  | "ready"
  /** A pointer is down on the handle. */
  | "dragging"
  /** An answer was submitted; locked until tryAgain(). */
  | "submitted"
  /** No valid geometry: interaction is refused. */
  | "disabled";

export interface SliderControllerOptions {
  recorder: EventRecorder;
  /** Visual update only (writes the handle transform). Called often; must not set React state. */
  onPosition: (position: number) => void;
  onPhase: (phase: SliderPhase) => void;
  /** Called once per valid release (or keyboard Enter). Never called after pointercancel. */
  onSubmit: (answer: SliderAnswer, layout: SliderLayout, via: SubmitVia) => void;
}

const KEY_STEP = 0.01;
const HANDLED_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Space"]);

/**
 * DOM-free interaction state machine for the slider. The React layer forwards events and performs
 * the DOM-only side effects (pointer capture). Everything here is deterministic and unit-tested.
 *
 * Geometry policy: layout is a cached snapshot (updated by ResizeObserver, never measured per
 * move). If it changes during a drag, the attempt is cancelled (recorded as pointercancel, handle
 * returns to 0) instead of mixing two coordinate systems in one attempt.
 */
export class SliderController {
  private phase: SliderPhase = "disabled";
  private layout: SliderLayout | null = null;
  private position = 0;
  private activePointerId: number | null = null;
  private last: PointerSample | null = null;
  private disposed = false;
  /** Pointers whose attempt was aborted but are still physically down: their events are dropped until up/cancel. */
  private readonly ignored = new Set<number>();
  /** Keys whose keydown was recorded; only their keyup is recorded (keeps down/up pairs consistent). */
  private readonly pressedKeys = new Set<string>();
  /** Set by the DOM layer so an aborted drag also releases pointer capture. */
  releasePointer: (pointerId: number) => void = () => {};

  constructor(private readonly opts: SliderControllerOptions) {}

  get currentPhase(): SliderPhase {
    return this.phase;
  }

  get currentPosition(): number {
    return this.position;
  }

  get isDragging(): boolean {
    return this.activePointerId !== null;
  }

  /** Pass null when the surface is not measurable. Invalid geometry disables interaction. */
  setLayout(layout: SliderLayout | null): void {
    if (this.disposed) return;
    const valid = layout !== null && isValidSliderLayout(layout);
    const changed =
      !valid ||
      this.layout === null ||
      layout.trackLeft !== this.layout.trackLeft ||
      layout.trackWidth !== this.layout.trackWidth ||
      layout.handleWidth !== this.layout.handleWidth;
    if (this.activePointerId !== null && changed) this.abortActive();
    this.layout = valid ? layout : null;
    if (!valid) this.setPhase("disabled");
    else if (this.phase === "disabled") this.setPhase("ready");
    else if (this.phase === "ready" || this.phase === "submitted") this.opts.onPosition(this.position);
  }

  /** Returns true when a drag started: the caller should then capture the pointer. */
  pointerDown(s: PointerSample, onHandle: boolean): boolean {
    if (this.disposed || this.phase !== "ready" || this.layout === null) return false;
    if (this.activePointerId !== null || !onHandle) return false;
    this.opts.recorder.record(toRecorderEvent("pointerdown", s, SLIDER_TARGETS.handle));
    this.activePointerId = s.pointerId;
    this.last = s;
    this.moveTo(s);
    this.setPhase("dragging");
    return true;
  }

  pointerMove(s: PointerSample): void {
    if (this.disposed || this.layout === null || this.ignored.has(s.pointerId)) return;
    if (this.activePointerId === s.pointerId) {
      this.opts.recorder.record(toRecorderEvent("pointermove", s, SLIDER_TARGETS.handle));
      this.last = s;
      this.moveTo(s);
    } else if (this.activePointerId === null && this.phase === "ready" && s.pointerType === "mouse") {
      // Hover approach before the press is part of the motion record.
      this.opts.recorder.record(toRecorderEvent("pointermove", s, SLIDER_TARGETS.track));
    }
  }

  /** Returns true when this pointer's attempt ended (the caller should release capture). */
  pointerUp(s: PointerSample): boolean {
    if (this.ignored.delete(s.pointerId)) return false;
    if (this.disposed || this.activePointerId !== s.pointerId || this.layout === null) return false;
    this.opts.recorder.record(toRecorderEvent("pointerup", s, SLIDER_TARGETS.handle));
    this.moveTo(s);
    this.activePointerId = null;
    this.last = null;
    this.setPhase("submitted");
    this.opts.onSubmit({ position: this.position }, this.layout, "pointer");
    return true;
  }

  /** pointercancel, or lostpointercapture without a preceding pointerup. Never submits. */
  pointerCancel(pointerId: number, s?: PointerSample): boolean {
    this.ignored.delete(pointerId);
    if (this.disposed || this.activePointerId !== pointerId) return false;
    this.abortActive(s, false);
    return true;
  }

  /**
   * lostpointercapture / failed capture without a pointerup. The pointer may still be down, so the
   * rest of its events are dropped until its pointerup/pointercancel. Never submits.
   */
  lostCapture(pointerId: number, s?: PointerSample): boolean {
    if (this.disposed || this.activePointerId !== pointerId) return false;
    this.abortActive(s, true);
    return true;
  }

  keyDown(code: string): void {
    if (this.disposed || this.phase !== "ready" || this.layout === null || !HANDLED_KEYS.has(code)) return;
    this.opts.recorder.record({ type: "keydown", code, target: SLIDER_TARGETS.handle });
    if (code === "Enter" || code === "Space") {
      // Its keyup arrives after the submission snapshot: not recorded, so it cannot leak into a retry.
      this.setPhase("submitted");
      this.opts.onSubmit({ position: this.position }, this.layout, "keyboard");
      return;
    }
    this.pressedKeys.add(code);
    const next =
      code === "Home" ? 0 : code === "End" ? 1 : this.position + (code === "ArrowLeft" ? -1 : 1) * KEY_STEP;
    this.setPosition(next);
  }

  keyUp(code: string): void {
    if (this.disposed || !this.pressedKeys.delete(code) || this.layout === null) return;
    this.opts.recorder.record({ type: "keyup", code, target: SLIDER_TARGETS.handle });
  }

  tryAgain(): void {
    if (this.disposed || this.phase !== "submitted") return;
    this.setPosition(0);
    this.setPhase("ready");
  }

  /** Reverses dispose(); React StrictMode runs effect cleanup then setup on the same instance. */
  activate(): void {
    this.disposed = false;
  }

  dispose(): void {
    this.disposed = true;
    this.activePointerId = null;
    this.last = null;
  }

  private abortActive(s?: PointerSample, stillDown = true): void {
    const at = s ?? this.last;
    const id = this.activePointerId;
    if (at && id !== null) {
      this.opts.recorder.record(toRecorderEvent("pointercancel", { ...at, pointerId: id }, SLIDER_TARGETS.handle));
    }
    this.activePointerId = null;
    this.last = null;
    if (id !== null) {
      if (stillDown) this.ignored.add(id); // cleared by its pointerup/pointercancel
      this.releasePointer(id);
    }
    this.setPosition(0);
    if (this.layout !== null) this.setPhase("ready");
  }

  private moveTo(s: PointerSample): void {
    if (this.layout === null) return;
    this.setPosition(pointerXToPosition(s.x, this.layout));
  }

  private setPosition(position: number): void {
    this.position = Math.min(1, Math.max(0, position));
    this.opts.onPosition(this.position);
  }

  private setPhase(phase: SliderPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.opts.onPhase(phase);
  }
}
