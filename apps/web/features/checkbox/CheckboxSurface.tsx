"use client";

import { useEffect, useRef, type KeyboardEvent, type MutableRefObject, type PointerEvent } from "react";
import { toPointerSample } from "@/lib/pointer-adapter";
import type { CheckboxController } from "./checkbox-controller";

export interface ControlSize {
  width: number;
  height: number;
}

interface Props {
  controller: CheckboxController;
  checked: boolean;
  /** Set by the surface; lets the session read the control's size at submit time (for replay drawing). */
  measureRef: MutableRefObject<() => ControlSize | null>;
}

/**
 * DOM wiring only. The NATIVE `<input type="checkbox">` is the source of truth for the checked state
 * and for keyboard/label semantics; the surrounding `<label>` makes the whole row the click target.
 * Handlers sit on the label, so pointer events from the input, its text and the box bubble there and
 * are each recorded once. No pointer capture: a press needs no drag. Whether a press activates the box is
 * left to the browser (the native change event), never inferred from geometry. Key events are recorded on
 * the input for Space only.
 */
export function CheckboxSurface({ controller, checked, measureRef }: Props) {
  const labelRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    controller.activate();
    measureRef.current = () => {
      const r = labelRef.current?.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0 ? { width: r.width, height: r.height } : null;
    };
    return () => {
      controller.dispose();
      measureRef.current = () => null;
    };
  }, [controller, measureRef]);

  const sample = (e: PointerEvent<HTMLLabelElement>) => {
    const r = labelRef.current?.getBoundingClientRect();
    return r ? toPointerSample(e, { left: r.left, top: r.top }) : null;
  };

  return (
    <label
      ref={labelRef}
      data-testid="checkbox-label"
      className="flex w-full max-w-md cursor-pointer select-none items-center gap-3 rounded-lg border border-line bg-bg px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const s = sample(e);
        if (s) controller.pointerDown(s);
      }}
      onPointerMove={(e) => {
        const s = sample(e);
        if (s) controller.pointerMove(s);
      }}
      onPointerUp={(e) => {
        const s = sample(e);
        if (s) controller.pointerUp(s);
        else controller.pointerCancel(e.pointerId);
      }}
      onPointerCancel={(e) => controller.pointerCancel(e.pointerId, sample(e) ?? undefined)}
    >
      <input
        type="checkbox"
        data-testid="checkbox-input"
        checked={checked}
        onChange={(e) => controller.change(e.currentTarget.checked)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => controller.keyDown(e.code, e.repeat)}
        onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => controller.keyUp(e.code)}
        onBlur={() => controller.blur()}
        className="h-6 w-6 shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      <span className="text-base">Check this box to pass the challenge</span>
    </label>
  );
}
