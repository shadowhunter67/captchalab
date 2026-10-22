import { useRef, type ComponentProps, type RefObject } from "react";
import type { ReplayControls } from "@/components/inspect/ReplayControls";
import type { ReplayClockState } from "./replay-clock";
import { useReplayDriver } from "./useReplayDriver";

type ControlsProps = ComponentProps<typeof ReplayControls>;

export interface ReplayPanel {
  /** Attach to the element wrapping the replay (it exposes `data-replay-time` / `data-replay-status`). */
  hostRef: RefObject<HTMLDivElement | null>;
  /** Spread onto <ReplayControls />. */
  controlsProps: ControlsProps;
}

/**
 * The glue every replay shares: a driver for the range, the scrubber and time label updated imperatively
 * each frame, status data attributes on the host, and the control handlers. A CAPTCHA supplies only
 * `drawFrame`, which paints ITS OWN replay state for the clock state (SVG refs, extra data attributes).
 * `drawFrame` runs per frame: touch the DOM through refs, never React state.
 */
export function useReplayPanel(
  range: readonly [number, number] | null,
  sessionKey: unknown,
  drawFrame: (state: ReplayClockState, host: HTMLDivElement | null) => void,
): ReplayPanel {
  const hostRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const onFrame = (s: ReplayClockState): void => {
    const t = s.currentTime;
    if (rangeRef.current) rangeRef.current.value = String(t);
    if (labelRef.current) {
      labelRef.current.textContent = `${((t - s.startTime) / 1000).toFixed(2)} s / ${((s.endTime - s.startTime) / 1000).toFixed(2)} s`;
    }
    const host = hostRef.current;
    if (host) {
      host.dataset.replayTime = String(Math.round(t));
      host.dataset.replayStatus = s.status;
    }
    drawFrame(s, host);
  };

  const { driver, status, speed } = useReplayDriver(range, sessionKey, onFrame);

  return {
    hostRef,
    controlsProps: {
      status,
      speed,
      startTime: range ? range[0] : 0,
      endTime: range ? range[1] : 0,
      disabled: driver === null,
      onPlayPause: () => (status === "playing" ? driver?.pause() : driver?.play()),
      onRestart: () => driver?.restart(),
      onSpeed: (s) => driver?.setSpeed(s),
      onSeek: (t) => driver?.seek(t),
      rangeRef,
      labelRef,
    },
  };
}
