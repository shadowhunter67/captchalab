import {
  createReplayClock,
  pause,
  play,
  restart,
  seek,
  setSpeed,
  tick,
  type ReplayClockState,
  type ReplaySpeed,
} from "./replay-clock";

/** Injectable time source so the driver is testable without real animation frames. */
export interface Scheduler {
  now(): number;
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export const browserScheduler: Scheduler = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface ReplayDriverOptions {
  scheduler?: Scheduler;
  /** When true, play() jumps straight to the end instead of animating. */
  reducedMotion?: () => boolean;
  /** Longest elapsed time credited to one frame, so a backgrounded tab does not skip the replay. */
  maxFrameMs?: number;
}

type Listener = (state: ReplayClockState) => void;

/**
 * requestAnimationFrame driver around the pure clock. It owns the only timer: every frame it
 * credits (now - lastFrame) to the clock at the CURRENT speed.
 *
 * Anchor rule: lastFrame is the wall time up to which elapsed time has been credited. Any operation
 * that changes how time maps to the clock (pause, speed change, seek, restart) first settles the
 * time elapsed since lastFrame at the old speed/position and re-bases lastFrame to now, so a stale
 * anchor can never leak into a new position or speed. Starting playback re-bases too, so paused time
 * is never credited.
 *
 * Listeners are called on every state change (per frame while playing); they should update the
 * DOM imperatively, not React state.
 */
export class ReplayDriver {
  private state: ReplayClockState;
  private notified: ReplayClockState;
  private readonly listeners = new Set<Listener>();
  private frameId: number | null = null;
  private lastFrame = 0;
  private disposed = false;
  private readonly scheduler: Scheduler;
  private readonly reducedMotion: () => boolean;
  private readonly maxFrameMs: number;

  constructor(startTime: number, endTime: number, options: ReplayDriverOptions = {}) {
    this.state = createReplayClock(startTime, endTime);
    this.notified = this.state;
    this.scheduler = options.scheduler ?? browserScheduler;
    this.reducedMotion = options.reducedMotion ?? (() => false);
    this.maxFrameMs = options.maxFrameMs ?? 250;
  }

  get snapshot(): ReplayClockState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play(): void {
    if (this.disposed) return;
    if (this.reducedMotion()) {
      this.commit(seek(this.state, this.state.endTime));
      return;
    }
    this.commit(play(this.state));
  }

  pause(): void {
    if (this.disposed) return;
    this.settle();
    this.commit(pause(this.state));
  }

  restart(): void {
    if (this.disposed) return;
    if (this.reducedMotion()) {
      this.commit(seek(this.state, this.state.endTime));
      return;
    }
    this.settle();
    this.commit(restart(this.state));
  }

  setSpeed(speed: ReplaySpeed): void {
    if (this.disposed) return;
    this.settle(); // time so far counts at the old speed
    this.commit(setSpeed(this.state, speed));
  }

  /** Scrub: a playing replay keeps playing from the new time. */
  seek(time: number): void {
    if (this.disposed) return;
    this.settle();
    this.commit(seek(this.state, time));
  }

  dispose(): void {
    this.disposed = true;
    this.stopLoop();
    this.listeners.clear();
  }

  /** Credit time elapsed since lastFrame at the current speed, and re-base the anchor to now. */
  private settle(): void {
    if (this.state.status !== "playing") return;
    const now = this.scheduler.now();
    const dt = Math.min(Math.max(0, now - this.lastFrame), this.maxFrameMs);
    this.lastFrame = now;
    this.state = tick(this.state, dt);
  }

  private commit(next: ReplayClockState): void {
    this.state = next;
    if (next === this.notified) return;
    this.notified = next;
    if (next.status === "playing") this.startLoop();
    else this.stopLoop();
    for (const l of this.listeners) l(next);
  }

  private startLoop(): void {
    if (this.frameId !== null) return;
    this.lastFrame = this.scheduler.now(); // re-based: paused time is never credited
    this.frameId = this.scheduler.request(this.onFrame);
  }

  private stopLoop(): void {
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
  }

  private readonly onFrame = (now: number): void => {
    this.frameId = null;
    if (this.disposed) return;
    const dt = Math.min(Math.max(0, now - this.lastFrame), this.maxFrameMs);
    this.lastFrame = now;
    this.state = tick(this.state, dt);
    this.notified = this.state;
    if (this.state.status === "playing") this.frameId = this.scheduler.request(this.onFrame);
    for (const l of this.listeners) l(this.state);
  };
}
