"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPointerTimeline, type InteractionSession } from "@captchalab/captcha-core";
import { SLIDER_TARGETS, type SliderChallenge, type SliderLayout } from "@captchalab/captcha-plugins";
import { buildTrajectory } from "./trajectory";
import { createHandleReplay } from "./replay-state";
import { TRACK_HEIGHT_PX } from "./SliderSurface";

interface Props {
  session: InteractionSession;
  layout: SliderLayout;
  challenge: SliderChallenge;
}

/**
 * Trajectory (static) plus replay (virtual pointer). Consumes only the stored InteractionSession:
 * the replay queries core's pointer timeline and draws a virtual cursor and handle in SVG. It never
 * dispatches DOM events or drives the real slider. Per-frame updates are imperative (refs), not state.
 */
export function TrajectoryReplay({ session, layout, challenge }: Props) {
  const traj = useMemo(
    () => buildTrajectory(session, layout, challenge, TRACK_HEIGHT_PX),
    [session, layout, challenge],
  );
  const timeline = useMemo(() => createPointerTimeline(session), [session]);
  const handleAt = useMemo(
    () => createHandleReplay(session, timeline, layout, SLIDER_TARGETS.handle),
    [session, timeline, layout],
  );

  const cursorRef = useRef<SVGCircleElement>(null);
  const handleRef = useRef<SVGRectElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  const span = traj.span;

  const stop = (): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const applyTime = (t: number): void => {
    if (!span) return;
    const p = timeline.at(t);
    const cursor = cursorRef.current;
    const handle = handleRef.current;
    if (!p || !cursor || !handle) return;
    cursor.setAttribute("cx", String(p.x));
    cursor.setAttribute("cy", String(p.y));
    // Pressed pointer is drawn larger: state is not conveyed by color alone.
    cursor.setAttribute("r", p.down ? "9" : "5");
    // The handle follows recorded drags only; hovering never moves it.
    handle.setAttribute("x", String(layout.trackLeft + handleAt(t)));
    if (rangeRef.current) rangeRef.current.value = String(t);
    if (labelRef.current) {
      labelRef.current.textContent = `${((t - span.startT) / 1000).toFixed(2)} s / ${((span.endT - span.startT) / 1000).toFixed(2)} s`;
    }
  };

  // New or updated session: stop any running replay and show the start state.
  useEffect(() => {
    stop();
    if (span) applyTime(span.startT);
    return stop;
  }, [traj, timeline, handleAt]);

  const play = (): void => {
    if (!span) return;
    stop();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      applyTime(span.endT);
      return;
    }
    const began = performance.now();
    const tick = (now: number): void => {
      const t = span.startT + (now - began);
      if (t >= span.endT) {
        applyTime(span.endT);
        rafRef.current = null;
        return;
      }
      applyTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const vb = traj.viewBox;
  return (
    <section aria-labelledby="traj-h" className="rounded-lg border border-line bg-panel p-4">
      <h3 id="traj-h" className="mb-3 text-base font-semibold">
        Trajectory and replay
      </h3>
      {!span ? (
        <p className="text-sm text-muted">
          No pointer samples were recorded (keyboard-only interaction), so there is no trajectory to draw.
        </p>
      ) : (
        <>
          <svg
            role="img"
            aria-label={`Pointer trajectory across ${traj.paths.length} movement track(s). Start is a circle, end is a square; the dashed band is the accepted release region.`}
            viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
            className="w-full rounded-md bg-bg ring-1 ring-line"
            style={{ aspectRatio: `${vb.width} / ${vb.height}`, maxHeight: 260 }}
            data-testid="trajectory-svg"
          >
            <rect {...traj.track} fill="var(--track)" />
            <rect
              {...traj.targetRegion}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            <rect
              ref={handleRef}
              x={layout.trackLeft}
              y={0}
              width={layout.handleWidth}
              height={TRACK_HEIGHT_PX}
              rx={6}
              fill="var(--accent)"
              opacity={0.28}
            />
            {traj.paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="var(--fg)" strokeWidth={1.5} strokeLinejoin="round" />
            ))}
            {traj.start && <circle cx={traj.start.x} cy={traj.start.y} r={5} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2} />}
            {traj.end && (
              <rect x={traj.end.x - 5} y={traj.end.y - 5} width={10} height={10} fill="var(--fg)" />
            )}
            <circle ref={cursorRef} cx={0} cy={0} r={5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />
          </svg>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={play}
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
            >
              Replay interaction
            </button>
            <input
              ref={rangeRef}
              type="range"
              aria-label="Replay position"
              min={span.startT}
              max={span.endT}
              step={1}
              defaultValue={span.startT}
              onChange={(e) => {
                stop();
                applyTime(Number(e.currentTarget.value));
              }}
              className="min-w-40 flex-1"
            />
            <span ref={labelRef} className="font-mono text-xs text-muted" aria-live="off" />
          </div>
          <p className="mt-2 text-xs text-muted">
            Circle: start. Square: end. Dashed band: accepted release region. The replay is a drawing of your
            recorded events; it does not control the slider. With reduced motion enabled, Replay jumps to the
            end; use the position control to step through.
          </p>
        </>
      )}
    </section>
  );
}
