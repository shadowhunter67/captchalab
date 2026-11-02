"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { positionToTravelPx, type SliderLayout, type SliderPuzzle } from "@captchalab/captcha-plugins";
import { PuzzlePicture, pieceShift } from "@/lib/art/PuzzlePicture";
import { useT } from "@/lib/i18n";
import { toPointerSample, type SurfaceOrigin } from "@/lib/pointer-adapter";
import type { SliderController, SliderPhase } from "./slider-controller";

export const HANDLE_WIDTH_PX = 48;
export const TRACK_HEIGHT_PX = 56;

const KEYS_WE_HANDLE = new Set(["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Space"]);

interface Props {
  controller: SliderController;
  /** Normalized target, used only to draw the target marker. */
  target: number;
  /** Normalized accepted release distance; draws the width of the accepted window. */
  tolerance?: number;
  phase: SliderPhase;
  /** The puzzle variant's picture: a scene with a gap and a piece that follows the handle. Presentation only. */
  puzzle?: SliderPuzzle | undefined;
  /** Set by the surface; the controller calls it (no React state) to move the handle. */
  applyPositionRef: MutableRefObject<(position: number) => void>;
}

/**
 * Assumes an untransformed, borderless track (pointer origin = its bounding rect, width = clientWidth).
 * A CSS transform on an ancestor, or the track shifting sideways without resizing mid-drag, would skew
 * coordinates (backlog).
 *
 * DOM wiring only: forwards Pointer Events to the controller, owns pointer capture and layout
 * measurement. One handler set on the track; events captured by the handle bubble here, so each
 * event is seen (and recorded) exactly once.
 */
export function SliderSurface({ controller, target, tolerance, phase, puzzle, applyPositionRef }: Props) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<SurfaceOrigin>({ left: 0, top: 0 });
  const layoutRef = useRef<SliderLayout | null>(null);
  const pieceRef = useRef<SVGGElement | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const handle = handleRef.current;
    if (!track || !handle) return;

    const refreshOrigin = (): void => {
      const r = track.getBoundingClientRect();
      originRef.current = { left: r.left, top: r.top };
    };
    // Size only: never measured per pointermove. Origin is refreshed on enter/down/scroll/resize.
    const measure = (): void => {
      refreshOrigin();
      const trackWidth = track.clientWidth;
      const handleWidth = handle.offsetWidth;
      const layout: SliderLayout | null =
        trackWidth > 0 && handleWidth > 0 ? { trackLeft: 0, trackWidth, handleWidth } : null;
      layoutRef.current = layout;
      controller.setLayout(layout);
    };

    applyPositionRef.current = (position) => {
      const layout = layoutRef.current;
      if (!layout) return;
      handle.style.transform = `translate3d(${positionToTravelPx(position, layout)}px,0,0)`;
      handle.setAttribute("aria-valuenow", String(Math.round(position * 100)));
      pieceRef.current?.setAttribute("transform", `translate(${pieceShift(position, target)} 0)`);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(handle);
    window.addEventListener("scroll", refreshOrigin, { passive: true, capture: true });
    window.addEventListener("resize", refreshOrigin, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", refreshOrigin, true);
      window.removeEventListener("resize", refreshOrigin);
      applyPositionRef.current = () => {};
    };
  }, [controller, applyPositionRef, target]);

  // Unmount safety: never leave a drag active.
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);

  const releaseCapture = (pointerId: number): void => {
    const handle = handleRef.current;
    try {
      if (handle?.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    } catch {
      /* capture already gone */
    }
  };
  // Aborts initiated by the controller (e.g. resize mid-drag) must also release capture.
  controller.releasePointer = releaseCapture;

  const refreshOrigin = (): void => {
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    originRef.current = { left: r.left, top: r.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    refreshOrigin();
    const sample = toPointerSample(e, originRef.current);
    const handle = handleRef.current;
    if (!sample || !handle) return;
    const onHandle = handle.contains(e.target as Node);
    if (controller.pointerDown(sample, onHandle)) {
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // Capture failed (pointer already gone): do not leave a drag stuck.
        controller.lostCapture(e.pointerId, sample);
        return;
      }
      handle.focus({ preventScroll: true });
      e.preventDefault();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const sample = toPointerSample(e, originRef.current);
    if (sample) controller.pointerMove(sample);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const sample = toPointerSample(e, originRef.current);
    if (sample && controller.pointerUp(sample)) releaseCapture(e.pointerId);
    else if (!sample && controller.lostCapture(e.pointerId)) releaseCapture(e.pointerId);
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const sample = toPointerSample(e, originRef.current) ?? undefined;
    if (controller.pointerCancel(e.pointerId, sample)) releaseCapture(e.pointerId);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!KEYS_WE_HANDLE.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat || e.code.startsWith("Arrow")) controller.keyDown(e.code);
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (KEYS_WE_HANDLE.has(e.code)) controller.keyUp(e.code);
  };

  const disabled = phase === "disabled";
  const locked = phase === "submitted";

  const track = (
    <div
      ref={trackRef}
      data-testid="slider-track"
      onPointerEnter={refreshOrigin}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={(e) => {
        // Capture lost without pointerup (e.g. element removed): abort, never submit.
        controller.lostCapture(e.pointerId);
      }}
      className="relative h-14 select-none overflow-hidden rounded-lg bg-track ring-1 ring-line"
      style={{ height: TRACK_HEIGHT_PX }}
    >
      {puzzle && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
          {t("Kéo để ghép mảnh vào chỗ khuyết", "Slide to fit the piece into the gap")}
        </span>
      )}
      {/* Target marker: a dashed ghost of the handle at the target position (size-independent). Not shown for the puzzle: its gap is the target. */}
      {!puzzle && <div
        aria-hidden="true"
        data-testid="slider-target"
        className="absolute top-0 h-full rounded-md border-2 border-dashed border-accent"
        style={{
          width: HANDLE_WIDTH_PX,
          left: `calc((100% - ${HANDLE_WIDTH_PX}px) * ${target})`,
        }}
      />}
      {tolerance !== undefined && !puzzle && (
        <div
          aria-hidden="true"
          data-testid="slider-tolerance"
          className="absolute bottom-1 h-1.5 rounded-full bg-accent/60"
          style={{
            left: `calc((100% - ${HANDLE_WIDTH_PX}px) * ${target - tolerance} + ${HANDLE_WIDTH_PX / 2}px)`,
            width: `calc((100% - ${HANDLE_WIDTH_PX}px) * ${tolerance * 2})`,
          }}
        />
      )}
      <div
        ref={handleRef}
        data-testid="slider-handle"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          puzzle
            ? t("Tay nắm ghép hình. Kéo để mảnh ghép khớp vào chỗ khuyết, hoặc dùng phím mũi tên rồi nhấn Enter.", "Puzzle slider handle. Drag so the piece fits the gap, or use arrow keys and press Enter.")
            : t("Tay nắm thanh trượt CAPTCHA. Kéo tới khung nét đứt, hoặc dùng phím mũi tên rồi nhấn Enter.", "Slider CAPTCHA handle. Drag to the dashed outline, or use arrow keys and press Enter.")
        }
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-disabled={disabled || locked}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        className={[
          "absolute left-0 top-0 flex h-full items-center justify-center rounded-md bg-accent text-bg",
          // touch-action only here: the handle must not scroll the page while dragged;
          // the rest of the page keeps native touch scrolling.
          "touch-none",
          disabled ? "cursor-not-allowed opacity-50" : locked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        ].join(" ")}
        style={{ width: HANDLE_WIDTH_PX }}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⇄
        </span>
      </div>
    </div>
  );
  if (!puzzle) return track;
  return (
    <div className="max-w-[26rem] space-y-2">
      <PuzzlePicture puzzle={puzzle} target={target} pieceRef={pieceRef} className="w-full rounded-lg ring-1 ring-line" />
      {track}
    </div>
  );
}
