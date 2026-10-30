"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { createEventRecorder, type EventRecorder } from "@captchalab/captcha-core";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";

export interface CellHandlers {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * One recorder for a board of buttons (one challenge = one session; the parent remounts on a new challenge).
 * `handlers(target)` returns the event props of a cell: pointer down/up/cancel and Space/Enter keydown, recorded under
 * the cell's semantic target. A captured touch/pen release outside the button is recorded as a cancel, and a held key
 * does not repeat. The cell's own onClick (not here) changes state.
 */
export function useCellRecorder(captchaId: string): { recorder: EventRecorder; boardRef: RefObject<HTMLDivElement | null>; handlers: (target: string) => CellHandlers } {
  const boardRef = useRef<HTMLDivElement>(null);
  const [recorder] = useState(() => createEventRecorder({ captchaId }));

  const point = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>, target: string): void => {
    const rect = boardRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (!sample) return;
    const b = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    recorder.record(toRecorderEvent(kind === "pointerup" && !inside ? "pointercancel" : kind, sample, target));
  };

  const handlers = (target: string): CellHandlers => ({
    onPointerDown: (e) => point("pointerdown", e, target),
    onPointerUp: (e) => point("pointerup", e, target),
    onPointerCancel: (e) => point("pointercancel", e, target),
    onKeyDown: (e) => {
      const code = e.code === "NumpadEnter" ? "Enter" : e.code;
      if (code !== "Space" && code !== "Enter") return;
      if (e.repeat) e.preventDefault();
      else recorder.record({ type: "keydown", code, target });
    },
  });

  return { recorder, boardRef, handlers };
}
