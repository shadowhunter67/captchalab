import { CHECKBOX_ACTIVATION_KEY, CHECKBOX_TARGETS, type CheckboxAnswer } from "@captchalab/captcha-plugins";
import type { EventRecorder } from "@captchalab/captcha-core";
import { toRecorderEvent, type PointerSample } from "@/lib/pointer-adapter";

export interface CheckboxControllerOptions {
  recorder: EventRecorder;
  /** The native input's new state, for rendering. */
  onChecked: (checked: boolean) => void;
  /** The box became checked: verify now. Called after the activation's release events were recorded. */
  onSubmit: (answer: CheckboxAnswer) => void;
  /** The box was unchecked: the previous result no longer applies. */
  onClear: () => void;
}

/**
 * DOM-free recording + state transitions for the checkbox. Two separate concerns:
 *
 *  1. Recording input (the pointer and key methods): normalized events only, never decisions.
 *  2. State transition (`change`): the NATIVE input is the source of truth. The browser toggles it as the
 *     default action of the click, which is dispatched after pointerup (mouse/touch/pen) or after keyup
 *     (Space), so by the time `change` runs the press and its release are already in the recorder.
 *
 * The controller never toggles anything itself and never infers state from events.
 */
export class CheckboxController {
  private activePointerId: number | null = null;
  private last: PointerSample | null = null;
  private spaceHeld = false;
  private disposed = false;

  constructor(private readonly opts: CheckboxControllerOptions) {}

  get isPressed(): boolean {
    return this.activePointerId !== null || this.spaceHeld;
  }

  /** Only one contact at a time; a second finger/pen is ignored (it cannot activate the control). */
  pointerDown(s: PointerSample): void {
    if (this.disposed) return;
    if (this.activePointerId !== null && this.activePointerId !== s.pointerId) return;
    this.opts.recorder.record(toRecorderEvent("pointerdown", s, CHECKBOX_TARGETS.control));
    this.activePointerId = s.pointerId;
    this.last = s;
  }

  pointerMove(s: PointerSample): void {
    if (this.disposed || this.activePointerId !== s.pointerId) return;
    this.opts.recorder.record(toRecorderEvent("pointermove", s, CHECKBOX_TARGETS.control));
    this.last = s;
  }

  /**
   * Recorded as a release whenever the browser delivers it to the control. Whether that activates the
   * checkbox is the browser's call (touch/pen have implicit capture, so a release slightly outside still
   * clicks); it is never guessed from geometry. A mouse released elsewhere sends no pointerup here at all,
   * so that press simply stays open and is never counted as an activation.
   */
  pointerUp(s: PointerSample): void {
    if (this.disposed || this.activePointerId !== s.pointerId) return;
    this.opts.recorder.record(toRecorderEvent("pointerup", s, CHECKBOX_TARGETS.control));
    this.activePointerId = null;
    this.last = null;
  }

  /** pointercancel from the browser (e.g. a touch that became a scroll). */
  pointerCancel(pointerId: number, s?: PointerSample): void {
    if (this.disposed || this.activePointerId !== pointerId) return;
    const at = s ?? this.last;
    if (at) this.opts.recorder.record(toRecorderEvent("pointercancel", { ...at, pointerId }, CHECKBOX_TARGETS.control));
    this.activePointerId = null;
    this.last = null;
  }

  /** Only Space activates a native checkbox (Enter does not). Auto-repeat is not recorded. */
  keyDown(code: string, repeat: boolean): void {
    if (this.disposed || code !== CHECKBOX_ACTIVATION_KEY || repeat || this.spaceHeld) return;
    this.opts.recorder.record({ type: "keydown", code, target: CHECKBOX_TARGETS.control });
    this.spaceHeld = true;
  }

  keyUp(code: string): void {
    if (this.disposed || code !== CHECKBOX_ACTIVATION_KEY || !this.spaceHeld) return;
    this.opts.recorder.record({ type: "keyup", code, target: CHECKBOX_TARGETS.control });
    this.spaceHeld = false;
  }

  /**
   * The input lost focus (e.g. Alt-Tab) while Space was held: its keyup will never arrive here. Drop the
   * held flag so the next Space press is recorded; the orphan keydown stays in the log, unpaired.
   */
  blur(): void {
    this.spaceHeld = false;
  }

  /** Native change event. Also fires for activation that sent no pointer/key events (assistive tech). */
  change(checked: boolean): void {
    if (this.disposed) return;
    this.opts.onChecked(checked);
    if (checked) this.opts.onSubmit({ checked: true });
    else this.opts.onClear();
  }

  /** Reverses dispose(); React StrictMode runs effect cleanup then setup on the same instance. */
  activate(): void {
    this.disposed = false;
  }

  dispose(): void {
    this.disposed = true;
    this.activePointerId = null;
    this.last = null;
    this.spaceHeld = false;
  }
}
