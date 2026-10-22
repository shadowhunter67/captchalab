"use client";

import { useMemo, useRef } from "react";
import { createPointerTimeline, type InteractionSession } from "@captchalab/captcha-core";
import { SLIDER_TARGETS, type SliderChallenge, type SliderLayout } from "@captchalab/captcha-plugins";
import { ReplayControls } from "@/components/inspect/ReplayControls";
import { TrajectoryView } from "@/components/inspect/TrajectoryView";
import { useReplayDriver } from "@/lib/replay/useReplayDriver";
import type { ReplayClockState } from "@/lib/replay/replay-clock";
import type { SessionMarker } from "@/lib/replay/markers";
import { TRACK_HEIGHT_PX } from "./SliderSurface";
import { createHandleReplay } from "./replay-state";
import { buildSliderTrajectory } from "./slider-view-data";

interface Props {
  session: InteractionSession;
  markers: readonly SessionMarker[];
  layout: SliderLayout;
  challenge: SliderChallenge;
  selectedPoint: { x: number; y: number } | null;
}

/**
 * Replay is a drawing of recorded data, never control of the real slider:
 *   InteractionSession + markers -> derived models (pointer timeline, handle replay)
 *     -> ReplayDriver clock -> imperative SVG updates (cursor, ghost handle).
 * No DOM events are dispatched.
 */
export function SliderReplay({ session, markers, layout, challenge, selectedPoint }: Props) {
  const view = useMemo(
    () => buildSliderTrajectory(session, layout, challenge, TRACK_HEIGHT_PX),
    [session, layout, challenge],
  );
  const timeline = useMemo(() => createPointerTimeline(session), [session]);
  const handleAt = useMemo(
    () => createHandleReplay(session, timeline, layout, SLIDER_TARGETS.handle, markers),
    [session, timeline, layout, markers],
  );

  const svgHostRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGCircleElement>(null);
  const handleRef = useRef<SVGRectElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const span = view.geometry.span;
  // The replay also covers trailing markers (a "Try again" after the last pointer sample) and never
  // collapses to zero length, so equal timestamps still replay in recorded order.
  const lastMarkerT = markers.reduce((m, x) => Math.max(m, x.t), Number.NEGATIVE_INFINITY);
  const range = span
    ? ([span.startT, Math.max(span.endT, lastMarkerT, span.startT + 1)] as const)
    : null;

  const applyFrame = (s: ReplayClockState): void => {
    const t = s.currentTime;
    const p = timeline.at(t);
    cursorRef.current?.setAttribute("cx", String(p?.x ?? 0));
    cursorRef.current?.setAttribute("cy", String(p?.y ?? 0));
    // A pressed pointer is drawn larger, so state is not conveyed by color alone.
    cursorRef.current?.setAttribute("r", p?.down ? "9" : "5");
    handleRef.current?.setAttribute("x", String(layout.trackLeft + handleAt(t)));
    if (rangeRef.current) rangeRef.current.value = String(t);
    if (labelRef.current) {
      const total = s.endTime - s.startTime;
      labelRef.current.textContent = `${((t - s.startTime) / 1000).toFixed(2)} s / ${(total / 1000).toFixed(2)} s`;
    }
    const host = svgHostRef.current;
    if (host) {
      host.dataset.replayTime = String(Math.round(t));
      host.dataset.replayStatus = s.status;
    }
  };

  const { driver, status, speed } = useReplayDriver(range, session, applyFrame);

  if (!span) {
    return (
      <p className="text-sm text-muted" data-testid="trajectory-empty">
        No pointer samples were recorded (keyboard-only interaction), so there is no trajectory or replay.
      </p>
    );
  }

  return (
    <div ref={svgHostRef} data-testid="replay">
      <TrajectoryView
        geometry={view.geometry}
        testId="trajectory-svg"
        selectedPoint={selectedPoint}
        label={`Pointer trajectory across ${view.geometry.paths.length} movement track(s). Start is a circle, end is a square; the dashed band is the accepted release region.`}
        underlay={
          <>
            <rect {...view.track} fill="var(--track)" />
            <rect
              {...view.targetRegion}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            <rect
              ref={handleRef}
              data-testid="replay-handle"
              x={layout.trackLeft}
              y={0}
              width={layout.handleWidth}
              height={TRACK_HEIGHT_PX}
              rx={6}
              fill="var(--accent)"
              opacity={0.28}
            />
          </>
        }
        overlay={<circle ref={cursorRef} cx={0} cy={0} r={5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />}
      />
      <ReplayControls
        status={status}
        speed={speed}
        startTime={range ? range[0] : span.startT}
        endTime={range ? range[1] : span.endT}
        disabled={driver === null}
        onPlayPause={() => (status === "playing" ? driver?.pause() : driver?.play())}
        onRestart={() => driver?.restart()}
        onSpeed={(s) => driver?.setSpeed(s)}
        onSeek={(t) => driver?.seek(t)}
        rangeRef={rangeRef}
        labelRef={labelRef}
      />
      <p className="mt-2 text-xs text-muted">
        Circle: start. Square: end. Dashed band: accepted release region. The replay is a drawing of your recorded
        events; it does not control the slider. The pale block is where the handle was; hovering never moves it, and
        &quot;Try again&quot; snaps it back. With reduced motion enabled, Play jumps to the end; use the position
        control to step through.
      </p>
    </div>
  );
}
