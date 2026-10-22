/** Bump when the shape or meaning of InteractionEvent / InteractionSession changes. */
export const SCHEMA_VERSION = 2 as const;

export type PointerType = "mouse" | "touch" | "pen";

export type PointerEventKind =
  | "pointermove"
  | "pointerdown"
  | "pointerup"
  | "pointercancel"
  | "click"
  | "touchstart"
  | "touchmove"
  | "touchend";

export type KeyEventKind = "keydown" | "keyup";

interface EventBase {
  /** Milliseconds since session start, from a monotonic clock (performance.now). Never wall-clock. */
  t: number;
  /** Stable CaptchaLab identifier of the target element (not a DOM selector). */
  target?: string;
}

/** Coordinates are CSS px relative to the challenge surface's top-left corner. */
export interface PointerInteractionEvent extends EventBase {
  type: PointerEventKind;
  x: number;
  y: number;
  pointerType: PointerType;
  /** Identity of the pointer/contact (PointerEvent.pointerId; touch identifier for touch*). Mouse is constant. */
  pointerId: number;
  /** 0..1 when the device reports it. */
  pressure?: number;
}

/**
 * Stores `code` (physical key, e.g. "KeyA") only, never the typed character,
 * so keyboard timing can be analysed without recording what was typed.
 */
export interface KeyInteractionEvent extends EventBase {
  type: KeyEventKind;
  code: string;
}

export type InteractionEvent = PointerInteractionEvent | KeyInteractionEvent;

export function isPointerEvent(e: InteractionEvent): e is PointerInteractionEvent {
  return e.type !== "keydown" && e.type !== "keyup";
}

export function isKeyEvent(e: InteractionEvent): e is KeyInteractionEvent {
  return e.type === "keydown" || e.type === "keyup";
}

export type InputModality = "none" | "mouse" | "touch" | "pen" | "keyboard" | "mixed";

export interface ViewportInfo {
  width: number;
  height: number;
}

export interface InteractionSession {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  captchaId: string;
  /** Epoch ms. Informational only; never used by analysis. */
  startedAt: number;
  /** Monotonic ms from start to completion; at least the last event time. */
  durationMs: number;
  events: readonly InteractionEvent[];
  inputModality: InputModality;
  viewport?: ViewportInfo;
}
