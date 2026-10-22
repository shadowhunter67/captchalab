/**
 * Pure replay clock: a deterministic state machine over session time. No timers, no DOM.
 * A driver (replay-driver.ts) feeds it real elapsed time; tests feed it numbers.
 *
 * Times are ms on the session clock (same axis as event `t`), within [startTime, endTime].
 *
 * Transitions:
 *   play     idle|paused -> playing;  finished -> restart from the start;  playing -> unchanged
 *   pause    playing -> paused;       otherwise unchanged
 *   restart  -> start of the replay, playing
 *   seek(t)  clamps to range. t >= end -> finished. Otherwise a playing clock KEEPS PLAYING from
 *            the new time; idle/paused stay paused; finished becomes paused (no surprise autoplay).
 *   tick(dt) only when playing: advances by dt * speed; reaching the end -> finished at endTime.
 *   speed changes never move the clock; they apply to later ticks.
 * A zero-length range (no samples to replay) is born finished and ignores play.
 */

export type ReplaySpeed = 0.5 | 1 | 2;
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [0.5, 1, 2];

export type ReplayStatus = "idle" | "playing" | "paused" | "finished";

export interface ReplayClockState {
  readonly status: ReplayStatus;
  readonly currentTime: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly speed: ReplaySpeed;
}

export function replayDuration(s: ReplayClockState): number {
  return s.endTime - s.startTime;
}

export function createReplayClock(startTime: number, endTime: number): ReplayClockState {
  const empty = !(endTime > startTime);
  return {
    status: empty ? "finished" : "idle",
    currentTime: startTime,
    startTime,
    endTime: empty ? startTime : endTime,
    speed: 1,
  };
}

const isEmpty = (s: ReplayClockState): boolean => s.endTime <= s.startTime;

export function play(s: ReplayClockState): ReplayClockState {
  if (isEmpty(s)) return s;
  if (s.status === "playing") return s;
  if (s.status === "finished") return { ...s, status: "playing", currentTime: s.startTime };
  return { ...s, status: "playing" };
}

export function pause(s: ReplayClockState): ReplayClockState {
  return s.status === "playing" ? { ...s, status: "paused" } : s;
}

export function restart(s: ReplayClockState): ReplayClockState {
  if (isEmpty(s)) return s;
  return { ...s, status: "playing", currentTime: s.startTime };
}

export function setSpeed(s: ReplayClockState, speed: ReplaySpeed): ReplayClockState {
  return s.speed === speed ? s : { ...s, speed };
}

export function seek(s: ReplayClockState, time: number): ReplayClockState {
  if (!Number.isFinite(time)) return s;
  const t = Math.min(s.endTime, Math.max(s.startTime, time));
  if (isEmpty(s)) return s;
  if (t >= s.endTime) return { ...s, status: "finished", currentTime: s.endTime };
  const status: ReplayStatus = s.status === "playing" ? "playing" : "paused";
  return { ...s, status, currentTime: t };
}

export function tick(s: ReplayClockState, deltaMs: number): ReplayClockState {
  if (s.status !== "playing" || !(deltaMs > 0)) return s;
  const next = s.currentTime + deltaMs * s.speed;
  if (next >= s.endTime) return { ...s, status: "finished", currentTime: s.endTime };
  return { ...s, currentTime: next };
}
