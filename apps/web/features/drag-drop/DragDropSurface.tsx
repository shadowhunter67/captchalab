"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type PointerEvent } from "react";
import type { Point } from "@captchalab/captcha-core";
import {
  hitRadiusPx,
  isValidLayout,
  itemSizePx,
  normalizedToPx,
  type DragDropChallenge,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { toPointerSample, type SurfaceOrigin } from "@/lib/pointer-adapter";
import type { DragDropController, DragDropViewState } from "./drag-drop-controller";
import { ShapeGlyph } from "./ShapeGlyph";
import { shapeName, shapeNameLower } from "./shapes";

interface Props {
  challenge: DragDropChallenge;
  controller: DragDropController;
  view: DragDropViewState;
  /** Set by the surface; the controller calls it (no React state) to move an item. */
  applyItemRef: MutableRefObject<(itemId: string, centerPx: Point) => void>;
}

/**
 * DOM wiring only: forwards Pointer Events to the controller, owns pointer capture, measures the surface
 * with a ResizeObserver (size only) and snapshots its origin at pointerdown (never per move).
 *
 * Assumes an untransformed, borderless surface: a CSS transform on an ancestor, or the surface shifting
 * without resizing mid-drag, would skew coordinates (the same documented limitation as the slider).
 * Keyboard: shapes and drop areas are buttons. Enter or Space on a shape selects it, Enter or Space on a drop area places
 * it there, Escape unselects (see DragDropController.keySelect / keyPlace / keyCancel). Shapes come before drop areas in
 * the DOM, so Tab reaches every shape and then every drop area.
 */
export function DragDropSurface({ challenge, controller, view, applyItemRef }: Props) {
  const t = useT();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const capturedRef = useRef(new Map<number, HTMLElement>());
  const originRef = useRef<SurfaceOrigin>({ left: 0, top: 0 });
  const sizeRef = useRef(0);
  const [layout, setLayoutState] = useState<DragDropLayout | null>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    applyItemRef.current = (id, c) => {
      const el = itemRefs.current.get(id);
      if (el) el.style.transform = `translate3d(${c.x - sizeRef.current / 2}px,${c.y - sizeRef.current / 2}px,0)`;
    };
    const measure = (): void => {
      const w = surface.clientWidth;
      const h = surface.clientHeight;
      const next: DragDropLayout | null = w > 0 && h > 0 ? { width: w, height: h } : null;
      const valid = next !== null && isValidLayout(next);
      sizeRef.current = valid ? itemSizePx(challenge, next) : 0;
      setLayoutState(valid ? next : null);
      controller.setLayout(valid ? next : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(surface);
    return () => {
      ro.disconnect();
      applyItemRef.current = () => {};
    };
  }, [challenge, controller, applyItemRef]);

  useEffect(() => {
    controller.activate();
    controller.releasePointer = (pointerId) => {
      const el = capturedRef.current.get(pointerId);
      capturedRef.current.delete(pointerId);
      try {
        if (el?.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      } catch {
        /* capture already gone */
      }
    };
    return () => controller.dispose();
  }, [controller]);

  const sample = (e: PointerEvent<HTMLElement>) => toPointerSample(e, originRef.current);

  /** Enter and Space activate (a held key does not repeat), Escape unselects; nothing else is recorded or handled. */
  const onKey = (activate: (code: string) => void) => (e: KeyboardEvent<HTMLElement>) => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code === "Enter" || code === "Space") {
      e.preventDefault(); // Space must not scroll the page
      if (!e.repeat) activate(code);
    } else if (code === "Escape") {
      e.preventDefault();
      if (!e.repeat) controller.keyCancel(code);
    }
  };

  const onPointerDown = (itemId: string) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    originRef.current = { left: rect.left, top: rect.top }; // snapshot for this drag
    const s = sample(e);
    if (!s || !controller.pointerDown(s, itemId)) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      capturedRef.current.set(e.pointerId, e.currentTarget);
    } catch {
      controller.lostCapture(e.pointerId, s); // capture failed (pointer already gone): do not stay stuck
      return;
    }
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = sample(e);
    const ended = s ? controller.pointerUp(s) : false;
    if (!s) controller.lostCapture(e.pointerId);
    if (ended) controller.releasePointer(e.pointerId);
  };

  const size = layout ? itemSizePx(challenge, layout) : 0;
  const radius = layout ? hitRadiusPx(challenge, layout) : 0;
  const kindOf = (itemId: string) => challenge.items.find((i) => i.id === itemId)?.kind ?? "circle";

  return (
    <div
      ref={surfaceRef}
      data-testid="drag-surface"
      className="relative aspect-[4/3] w-full max-w-[560px] select-none overflow-hidden rounded-lg bg-bg ring-1 ring-line"
    >
      {challenge.items.map((item) => {
        const lifted = view.activeItemId === item.id;
        const selected = view.selectedItemId === item.id;
        const target = view.placements[item.id];
        const targetKind = target ? kindOf(challenge.targets.find((t) => t.id === target)?.acceptsItemId ?? "") : null;
        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(item.id, el);
              else itemRefs.current.delete(item.id);
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onKeyDown={onKey((code) => controller.keySelect(item.id, code))}
            aria-label={`${shapeName(item.kind, t)}, ${t("kéo bằng con trỏ hoặc chọn bằng Enter / Space", "drag with a pointer, or select with Enter / Space")}. ${
              selected
                ? t("Đã chọn, chờ vùng thả", "Selected, waiting for a drop area")
                : lifted
                ? t("Đang được kéo", "Being dragged")
                : target
                  ? t(`Đang ở vùng thả ${shapeNameLower(targetKind ?? "circle", t)}`, `On the ${shapeNameLower(targetKind ?? "circle", t)} drop area`)
                  : t("Chưa đặt", "Not placed")
            }`}
            data-testid={`item-${item.id}`}
            data-lifted={lifted}
            data-selected={selected}
            data-placement={target ?? ""}
            onPointerDown={onPointerDown(item.id)}
            onPointerMove={(e) => {
              const s = sample(e);
              if (s) controller.pointerMove(s);
            }}
            onPointerUp={onPointerUp}
            onPointerCancel={(e) => controller.pointerCancel(e.pointerId, sample(e) ?? undefined)}
            onLostPointerCapture={(e) => controller.lostCapture(e.pointerId)}
            // touch-action only on the draggable: it must not scroll the page while dragged; the rest keeps scrolling.
            className={`absolute left-0 top-0 touch-none rounded-full ${selected ? "z-20 ring-4 ring-accent ring-offset-2 ring-offset-bg" : ""} ${lifted ? "z-20 cursor-grabbing drop-shadow-lg" : selected ? "cursor-pointer" : "z-10 cursor-grab"}`}
            style={{ width: size, height: size, visibility: layout ? "visible" : "hidden" }}
          >
            <ShapeGlyph kind={item.kind} size={size} />
          </div>
        );
      })}
      {layout &&
        challenge.targets.map((tg) => {
          const kind = kindOf(tg.acceptsItemId);
          const c = normalizedToPx(tg.position, layout);
          const held = Object.entries(view.placements).find(([, target]) => target === tg.id)?.[0];
          return (
            <div
              key={tg.id}
              role="button"
              tabIndex={0}
              aria-disabled={view.selectedItemId === null}
              aria-label={`${t("Vùng thả cho", "Drop area for the")} ${shapeNameLower(kind, t)}${held ? `. ${t("Đang chứa", "Holds the")} ${shapeNameLower(kindOf(held), t)}` : `. ${t("Trống", "Empty")}`}. ${
                view.selectedItemId === null ? t("Hãy chọn một hình trước", "Select a shape first") : t(`Nhấn Enter hoặc Space để đặt ${shapeNameLower(kindOf(view.selectedItemId), t)} vào đây`, `Press Enter or Space to place the ${shapeNameLower(kindOf(view.selectedItemId), t)} here`)
              }`}
              data-testid={`drop-${tg.id}`}
              data-held={held ?? ""}
              onKeyDown={onKey((code) => controller.keyPlace(tg.id, code))}
              className={`absolute flex items-center justify-center rounded-full border-2 border-dashed ${view.selectedItemId === null ? "border-line" : "border-accent"}`}
              style={{ left: c.x - radius, top: c.y - radius, width: radius * 2, height: radius * 2 }}
            >
              <ShapeGlyph kind={kind} size={size} outline />
            </div>
          );
        })}
    </div>
  );
}
