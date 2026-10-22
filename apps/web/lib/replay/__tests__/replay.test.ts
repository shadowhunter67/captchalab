import { describe, expect, it } from "vitest";
import {
  createReplayClock,
  pause,
  play,
  replayDuration,
  restart,
  seek,
  setSpeed,
  tick,
} from "../replay-clock";
import { ReplayDriver, type Scheduler } from "../replay-driver";

describe("replay clock (pure)", () => {
  const fresh = () => createReplayClock(1000, 3000);

  it("starts idle at the start time", () => {
    const s = fresh();
    expect(s).toMatchObject({ status: "idle", currentTime: 1000, speed: 1 });
    expect(replayDuration(s)).toBe(2000);
  });

  it("play, tick at 1x, finish at the end", () => {
    let s = play(fresh());
    s = tick(s, 500);
    expect(s).toMatchObject({ status: "playing", currentTime: 1500 });
    s = tick(s, 5000);
    expect(s).toMatchObject({ status: "finished", currentTime: 3000 });
    expect(tick(s, 100)).toBe(s);
  });

  it("pause stops time; resume continues without loss", () => {
    let s = tick(play(fresh()), 400);
    s = pause(s);
    expect(tick(s, 999)).toBe(s);
    s = tick(play(s), 100);
    expect(s.currentTime).toBe(1500);
  });

  it("speed scales ticks and changing it mid-play does not move the clock", () => {
    let s = play(setSpeed(fresh(), 0.5));
    s = tick(s, 400);
    expect(s.currentTime).toBe(1200);
    s = setSpeed(s, 2);
    expect(s.currentTime).toBe(1200);
    s = tick(s, 400);
    expect(s.currentTime).toBe(2000);
  });

  it("restart goes to the start and plays, also from finished", () => {
    let s = tick(play(fresh()), 5000);
    expect(s.status).toBe("finished");
    s = restart(s);
    expect(s).toMatchObject({ status: "playing", currentTime: 1000 });
    expect(play(tick(play(fresh()), 5000))).toMatchObject({ status: "playing", currentTime: 1000 });
  });

  it("scrub semantics: playing keeps playing; idle/paused stay paused; finished becomes paused", () => {
    expect(seek(play(fresh()), 2000)).toMatchObject({ status: "playing", currentTime: 2000 });
    expect(seek(fresh(), 2000)).toMatchObject({ status: "paused", currentTime: 2000 });
    expect(seek(pause(play(fresh())), 1500)).toMatchObject({ status: "paused", currentTime: 1500 });
    const finished = tick(play(fresh()), 9999);
    expect(seek(finished, 1200)).toMatchObject({ status: "paused", currentTime: 1200 });
  });

  it("scrub clamps, scrub to the end finishes, non-finite is ignored", () => {
    expect(seek(fresh(), -5).currentTime).toBe(1000);
    expect(seek(fresh(), 99999)).toMatchObject({ status: "finished", currentTime: 3000 });
    const s = fresh();
    expect(seek(s, Number.NaN)).toBe(s);
  });

  it("an empty range is born finished and ignores play/restart", () => {
    const e = createReplayClock(5, 5);
    expect(e.status).toBe("finished");
    expect(play(e)).toBe(e);
    expect(restart(e)).toBe(e);
  });
});

/** Manual scheduler: frames fire only when the test advances time. */
function fakeScheduler() {
  let time = 0;
  let nextId = 1;
  const pending = new Map<number, (now: number) => void>();
  const scheduler: Scheduler = {
    now: () => time,
    request: (cb) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancel: (id) => void pending.delete(id),
  };
  return {
    scheduler,
    get pendingFrames() { return pending.size; },
    /** Wall time passes without a frame firing (frames are late, as in a busy tab). */
    idle(ms: number) {
      time += ms;
    },
    advance(ms: number) {
      time += ms;
      const frames = [...pending.entries()];
      pending.clear();
      for (const [, cb] of frames) cb(time);
    },
  };
}

describe("replay driver", () => {
  it("plays on frames, pauses (cancelling the frame) and resumes without drift", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 1000, { scheduler: f.scheduler });
    d.play();
    f.advance(100);
    expect(d.snapshot.currentTime).toBe(100);
    d.pause();
    expect(f.pendingFrames).toBe(0);
    f.advance(5000); // time passes while paused
    d.play();
    f.advance(100);
    expect(d.snapshot.currentTime).toBe(200); // the paused 5s was not credited
  });

  it("speed change takes effect on the next frame, 0.5x and 2x", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 10000, { scheduler: f.scheduler });
    d.setSpeed(0.5);
    d.play();
    f.advance(100);
    expect(d.snapshot.currentTime).toBe(50);
    d.setSpeed(2);
    f.advance(100);
    expect(d.snapshot.currentTime).toBe(250);
  });

  it("finishes at the end, stops requesting frames, and play() restarts", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 200, { scheduler: f.scheduler });
    d.play();
    f.advance(150);
    f.advance(150);
    expect(d.snapshot).toMatchObject({ status: "finished", currentTime: 200 });
    expect(f.pendingFrames).toBe(0);
    d.play();
    expect(d.snapshot).toMatchObject({ status: "playing", currentTime: 0 });
  });

  it("scrub while playing continues from the new time; restart rewinds", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 1000, { scheduler: f.scheduler });
    d.play();
    f.advance(100);
    d.seek(600);
    expect(d.snapshot).toMatchObject({ status: "playing", currentTime: 600 });
    f.advance(100);
    expect(d.snapshot.currentTime).toBe(700);
    d.restart();
    expect(d.snapshot).toMatchObject({ status: "playing", currentTime: 0 });
  });

  it("scrub to the end finishes and cancels the loop", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 1000, { scheduler: f.scheduler });
    d.play();
    d.seek(1000);
    expect(d.snapshot.status).toBe("finished");
    expect(f.pendingFrames).toBe(0);
  });

  it("caps a huge frame gap (backgrounded tab)", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 100000, { scheduler: f.scheduler, maxFrameMs: 250 });
    d.play();
    f.advance(60000);
    expect(d.snapshot.currentTime).toBe(250);
  });

  it("seek while playing re-bases the time anchor (no stale delta applied to the new position)", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 10000, { scheduler: f.scheduler });
    d.play();
    f.advance(100); // frame at wall 100: replay time 100
    f.idle(80); // wall 180, no frame yet
    d.seek(500);
    f.advance(20); // frame at wall 200
    // 80ms at the old position are credited before the jump; only 20ms after it (not 100ms)
    expect(d.snapshot.currentTime).toBe(520);
  });

  it("speed change settles elapsed time at the old speed first (piecewise, not retroactive)", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 10000, { scheduler: f.scheduler });
    d.play();
    f.advance(100); // replay time 100
    f.idle(80); // wall 180
    d.setSpeed(2);
    expect(d.snapshot.currentTime).toBe(180); // 100 + 80 at 1x
    f.advance(20); // wall 200 at 2x
    expect(d.snapshot.currentTime).toBe(220);
  });

  it("restart while playing starts exactly at the start", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 10000, { scheduler: f.scheduler });
    d.play();
    f.advance(100);
    f.idle(90);
    d.restart();
    expect(d.snapshot.currentTime).toBe(0);
    f.advance(10);
    expect(d.snapshot.currentTime).toBe(10);
  });

  it("pause credits the time played since the last frame", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 10000, { scheduler: f.scheduler });
    d.play();
    f.advance(100);
    f.idle(30);
    d.pause();
    expect(d.snapshot).toMatchObject({ status: "paused", currentTime: 130 });
  });

  it("settling can finish the replay and the listener hears about it exactly once", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 200, { scheduler: f.scheduler });
    d.play();
    f.advance(100);
    const states: string[] = [];
    d.subscribe((s) => states.push(s.status));
    f.idle(150); // wall 250; capped at maxFrameMs 250 -> reaches the end during settle
    d.pause();
    expect(d.snapshot).toMatchObject({ status: "finished", currentTime: 200 });
    expect(states).toEqual(["finished"]);
    expect(f.pendingFrames).toBe(0);
  });

  it("reduced motion jumps to the end instead of animating", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 1000, { scheduler: f.scheduler, reducedMotion: () => true });
    d.play();
    expect(d.snapshot).toMatchObject({ status: "finished", currentTime: 1000 });
    expect(f.pendingFrames).toBe(0);
  });

  it("notifies subscribers and stops after dispose (no frames, no callbacks)", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(0, 1000, { scheduler: f.scheduler });
    const seen: number[] = [];
    d.subscribe((s) => seen.push(s.currentTime));
    d.play();
    f.advance(100);
    expect(seen).toEqual([0, 100]);
    d.dispose();
    expect(f.pendingFrames).toBe(0);
    d.play();
    d.seek(500);
    f.advance(100);
    expect(seen).toEqual([0, 100]);
  });

  it("an empty range never schedules frames", () => {
    const f = fakeScheduler();
    const d = new ReplayDriver(10, 10, { scheduler: f.scheduler });
    d.play();
    expect(f.pendingFrames).toBe(0);
    expect(d.snapshot.status).toBe("finished");
  });
});
