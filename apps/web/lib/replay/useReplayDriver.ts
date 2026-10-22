import { useEffect, useRef, useState } from "react";
import { ReplayDriver } from "./replay-driver";
import type { ReplayClockState, ReplaySpeed, ReplayStatus } from "./replay-clock";

export interface ReplayView {
  driver: ReplayDriver | null;
  status: ReplayStatus;
  speed: ReplaySpeed;
}

/**
 * Owns a ReplayDriver for one replay range and session. The driver is created in an effect and
 * disposed in its cleanup, so unmounting, a changed range or a new `sessionKey` (a new session
 * object) cancels the animation frame and drops listeners: nothing keeps running after a reset.
 *
 * `sessionKey` must be the identity of an immutable session snapshot (a new snapshot = a new replay).
 *
 * `onFrame` is called for every clock change (per frame while playing) and should touch the DOM
 * through refs. Only status and speed go through React state, and only when they change.
 */
export function useReplayDriver(
  range: readonly [number, number] | null,
  sessionKey: unknown,
  onFrame: (state: ReplayClockState) => void,
): ReplayView {
  const frameRef = useRef(onFrame);
  const [view, setView] = useState<ReplayView>({ driver: null, status: "idle", speed: 1 });
  const currentDriver = view.driver;
  // After every commit: use the latest callback and re-draw the current clock state with it, so a
  // paused or finished replay never keeps showing a model from an earlier render.
  useEffect(() => {
    frameRef.current = onFrame;
    if (currentDriver) onFrame(currentDriver.snapshot);
  });
  const startT = range ? range[0] : null;
  const endT = range ? range[1] : null;

  useEffect(() => {
    if (startT === null || endT === null) {
      setView({ driver: null, status: "idle", speed: 1 });
      return;
    }
    const driver = new ReplayDriver(startT, endT, {
      reducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    const unsubscribe = driver.subscribe((s) => {
      frameRef.current(s);
      setView((v) => (v.driver === driver && v.status === s.status && v.speed === s.speed ? v : { driver, status: s.status, speed: s.speed }));
    });
    setView({ driver, status: driver.snapshot.status, speed: driver.snapshot.speed });
    frameRef.current(driver.snapshot);
    return () => {
      unsubscribe();
      driver.dispose();
    };
  }, [startT, endT, sessionKey]);

  return view;
}
