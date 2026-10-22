import type { EventRecorder, PointerType } from "@captchalab/captcha-core";

/**
 * DOM boundary: the only place that reads PointerEvent fields.
 *   DOM PointerEvent -> PointerSample (surface-relative, validated) -> recorder event
 * Pointer Events are the single event family emitted; legacy touch and mouse events are never recorded.
 */

/** Structural subset of PointerEvent, so tests need no DOM. */
export interface PointerLike {
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
  pressure: number;
}

/** Top-left of the interaction surface in client coordinates. */
export interface SurfaceOrigin {
  left: number;
  top: number;
}

export interface PointerSample {
  /** CSS px relative to the surface's top-left corner. */
  x: number;
  y: number;
  pointerId: number;
  pointerType: PointerType;
  pressure?: number;
}

export type PointerKind = "pointerdown" | "pointermove" | "pointerup" | "pointercancel";

type RecorderInput = Parameters<EventRecorder["record"]>[0];

function parsePointerType(raw: string): PointerType | null {
  return raw === "mouse" || raw === "touch" || raw === "pen" ? raw : null;
}

/** Returns null for non-finite coordinates/id or an unknown pointerType (never guessed, never fed downstream). */
export function toPointerSample(e: PointerLike, origin: SurfaceOrigin): PointerSample | null {
  const x = e.clientX - origin.left;
  const y = e.clientY - origin.top;
  const pointerType = parsePointerType(e.pointerType);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(e.pointerId) || pointerType === null) {
    return null;
  }
  return {
    x,
    y,
    pointerId: e.pointerId,
    pointerType,
    ...(Number.isFinite(e.pressure) ? { pressure: e.pressure } : {}),
  };
}

/** `target` is a semantic id (e.g. "slider-handle"), never a selector or class name. */
export function toRecorderEvent(kind: PointerKind, s: PointerSample, target: string): RecorderInput {
  return {
    type: kind,
    x: s.x,
    y: s.y,
    pointerId: s.pointerId,
    pointerType: s.pointerType,
    target,
    ...(s.pressure !== undefined ? { pressure: s.pressure } : {}),
  };
}
