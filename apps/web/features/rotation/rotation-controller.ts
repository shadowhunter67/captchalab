import type { EventRecorder, Point } from "@captchalab/captcha-core";
import {
  ROTATION_KEYS,
  ROTATION_TARGET,
  keyTurn,
  normalize360,
  pointerTurn,
  type RotationAnswer,
  type RotationChallenge,
} from "@captchalab/captcha-plugins";
import { toRecorderEvent, type PointerSample } from "@/lib/pointer-adapter";

export interface RotationControllerOptions {
  recorder: EventRecorder;
  challenge: RotationChallenge;
  /** Paint the object at an angle (degrees). Imperative; called per move; must not set React state. */
  onAngle: (angle: number) => void;
  /** Any rotation input started (clears a previous result). */
  onInput: () => void;
  onVerify: (answer: RotationAnswer, center: Point) => void;
}

interface Drag {
  pointerId: number;
  startAngle: number;
  prev: PointerSample;
  center: Point;
}

/**
 * DOM-free interaction logic for the rotation object. The turn rules (`pointerTurn`, `keyTurn`) are the
 * plugin's, the same ones the feature extractor replays:
 *  - a pointer drag turns the object by the change of the pointer's angle around the object's center
 *    (relative to where it was grabbed, never snapping to the pointer);
 *  - pointercancel / lost capture restore the angle from before the drag and are not an attempt result;
 *  - each ArrowLeft / ArrowRight keydown (auto-repeat included) turns the object 5 degrees.
 */
export class RotationController {
  private angle: number;
  private drag: Drag | null = null;
  private lastCenter: Point = { x: 0, y: 0 };
  private readonly ignored = new Set<number>();
  private disposed = false;
  releasePointer: (pointerId: number) => void = () => {};

  constructor(private readonly opts: RotationControllerOptions) {
    this.angle = normalize360(opts.challenge.initialAngle);
  }

  get currentAngle(): number {
    return this.angle;
  }

  paint(): void {
    this.opts.onAngle(this.angle);
  }

  /** `center`: the object's center in surface px, measured by the DOM layer at pointerdown. */
  pointerDown(sample: PointerSample, center: Point): boolean {
    if (this.disposed || this.drag !== null) return false;
    this.ignored.delete(sample.pointerId);
    this.opts.onInput();
    this.opts.recorder.record(toRecorderEvent("pointerdown", sample, ROTATION_TARGET));
    this.drag = { pointerId: sample.pointerId, startAngle: this.angle, prev: sample, center };
    this.lastCenter = center;
    return true;
  }

  pointerMove(sample: PointerSample): void {
    const d = this.drag;
    if (this.disposed || d === null || d.pointerId !== sample.pointerId) return;
    this.opts.recorder.record(toRecorderEvent("pointermove", sample, ROTATION_TARGET));
    this.turn(d, sample);
  }

  /** Returns true when the drag ended (the caller releases capture). */
  pointerUp(sample: PointerSample): boolean {
    const d = this.drag;
    if (this.ignored.delete(sample.pointerId)) return false;
    if (this.disposed || d === null || d.pointerId !== sample.pointerId) return false;
    this.opts.recorder.record(toRecorderEvent("pointerup", sample, ROTATION_TARGET));
    this.turn(d, sample);
    this.drag = null;
    return true;
  }

  pointerCancel(pointerId: number, sample?: PointerSample): void {
    this.ignored.delete(pointerId);
    if (this.disposed || this.drag === null || this.drag.pointerId !== pointerId) return;
    this.abort(sample, false);
  }

  lostCapture(pointerId: number, sample?: PointerSample): void {
    if (this.disposed || this.drag === null || this.drag.pointerId !== pointerId) return;
    this.abort(sample, true);
  }

  /** Arrow keys are ignored while a pointer drag is in progress (one input at a time). */
  keyDown(code: string): void {
    if (this.disposed || this.drag !== null || keyTurn(code) === 0) return;
    this.opts.onInput();
    this.opts.recorder.record({ type: "keydown", code, target: ROTATION_TARGET });
    this.angle = normalize360(this.angle + keyTurn(code));
    this.paint();
  }

  keyUp(code: string): void {
    if (this.disposed || this.drag !== null || (code !== ROTATION_KEYS.clockwise && code !== ROTATION_KEYS.counterClockwise)) return;
    this.opts.recorder.record({ type: "keyup", code, target: ROTATION_TARGET });
  }

  verify(): void {
    if (this.disposed || this.drag !== null) return;
    this.opts.onVerify({ angle: this.angle }, this.lastCenter);
  }

  activate(): void {
    this.disposed = false;
  }

  dispose(): void {
    if (this.drag) this.releasePointer(this.drag.pointerId);
    this.disposed = true;
    this.drag = null;
    this.ignored.clear();
  }

  private turn(d: Drag, sample: PointerSample): void {
    this.angle = normalize360(this.angle + pointerTurn(d.prev, sample, d.center));
    d.prev = sample;
    this.paint();
  }

  private abort(sample: PointerSample | undefined, stillDown: boolean): void {
    const d = this.drag;
    if (d === null) return;
    this.opts.recorder.record(toRecorderEvent("pointercancel", { ...(sample ?? d.prev), pointerId: d.pointerId }, ROTATION_TARGET));
    this.angle = d.startAngle;
    this.drag = null;
    if (stillDown) this.ignored.add(d.pointerId);
    this.releasePointer(d.pointerId);
    this.paint();
  }
}
