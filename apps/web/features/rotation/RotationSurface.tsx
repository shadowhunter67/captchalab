"use client";

import { useEffect, useRef, type KeyboardEvent, type MutableRefObject, type PointerEvent } from "react";
import { ROTATION_KEYS } from "@captchalab/captcha-plugins";
import { toPointerSample } from "@/lib/pointer-adapter";
import type { RotationController } from "./rotation-controller";
import { RotationGlyph } from "./RotationGlyph";

export const ROTATION_OBJECT_PX = 200;

interface Props {
  controller: RotationController;
  /** Set by the surface; the controller calls it (no React state) to rotate the object. */
  applyAngleRef: MutableRefObject<(angle: number) => void>;
}

/**
 * DOM wiring only. The object is a focusable `role="slider"` (a value in degrees changed with the arrow
 * keys, or by dragging), so keyboard and assistive technology can turn it. Pointer capture on the object;
 * the object's center and the surface origin are snapshotted at pointerdown.
 */
export function RotationSurface({ controller, applyAngleRef }: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const originRef = useRef({ left: 0, top: 0 });
  const capturedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    controller.activate();
    applyAngleRef.current = (angle) => {
      if (glyphRef.current) glyphRef.current.style.transform = `rotate(${angle}deg)`;
      const o = objectRef.current;
      if (o) {
        o.setAttribute("aria-valuenow", String(Math.round(angle)));
        o.setAttribute("aria-valuetext", `${Math.round(angle)} degrees clockwise from upright`);
        o.dataset.angle = angle.toFixed(1);
      }
    };
    controller.releasePointer = (pointerId) => {
      try {
        if (capturedRef.current?.hasPointerCapture(pointerId)) capturedRef.current.releasePointerCapture(pointerId);
      } catch {
        /* capture already gone */
      }
      capturedRef.current = null;
    };
    controller.paint();
    return () => {
      controller.dispose();
      applyAngleRef.current = () => {};
    };
  }, [controller, applyAngleRef]);

  const sample = (e: PointerEvent<HTMLElement>) => toPointerSample(e, originRef.current);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const surface = surfaceRef.current?.getBoundingClientRect();
    const obj = objectRef.current?.getBoundingClientRect();
    if (!surface || !obj) return;
    originRef.current = { left: surface.left, top: surface.top };
    const s = sample(e);
    if (!s) return;
    const center = { x: obj.left + obj.width / 2 - surface.left, y: obj.top + obj.height / 2 - surface.top };
    if (!controller.pointerDown(s, center)) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      capturedRef.current = e.currentTarget;
    } catch {
      controller.lostCapture(e.pointerId, s);
      return;
    }
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.code !== ROTATION_KEYS.clockwise && e.code !== ROTATION_KEYS.counterClockwise) return;
    e.preventDefault();
    controller.keyDown(e.code);
  };

  return (
    <div
      ref={surfaceRef}
      data-testid="rotation-surface"
      className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center rounded-lg bg-bg ring-1 ring-line"
    >
      <span aria-hidden="true" className="absolute left-1/2 top-2 -translate-x-1/2 text-xs text-muted">
        ▲ upright
      </span>
      <div
        ref={objectRef}
        data-testid="rotation-object"
        role="slider"
        tabIndex={0}
        aria-label="Object to turn. Turn it until the arrow points up. Drag it, or use the left and right arrow keys."
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={0}
        aria-orientation="horizontal"
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          const s = sample(e);
          if (s) controller.pointerMove(s);
        }}
        onPointerUp={(e) => {
          const s = sample(e);
          const ended = s ? controller.pointerUp(s) : false;
          if (!s) controller.lostCapture(e.pointerId);
          if (ended) controller.releasePointer(e.pointerId);
        }}
        onPointerCancel={(e) => controller.pointerCancel(e.pointerId, sample(e) ?? undefined)}
        onLostPointerCapture={(e) => controller.lostCapture(e.pointerId)}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => controller.keyUp(e.code)}
        // touch-action only on the object: it must not scroll the page while turned; the rest keeps scrolling.
        className="touch-none cursor-grab rounded-full active:cursor-grabbing"
        style={{ width: ROTATION_OBJECT_PX, height: ROTATION_OBJECT_PX }}
      >
        <div ref={glyphRef} style={{ width: ROTATION_OBJECT_PX, height: ROTATION_OBJECT_PX }}>
          <RotationGlyph size={ROTATION_OBJECT_PX} />
        </div>
      </div>
    </div>
  );
}
