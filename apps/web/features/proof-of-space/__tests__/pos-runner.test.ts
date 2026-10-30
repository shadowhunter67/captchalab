import { describe, expect, it } from "vitest";
import { createRng } from "@captchalab/captcha-core";
import { MAX_SPACE_BYTES, generatePosChallenge, verifyPosAnswer, type PosChallenge } from "@captchalab/captcha-plugins";
import { createPosRunner, type PosDone, type PosRunnerOptions } from "../pos-runner";

const make = (variantId: string, seed = 5): PosChallenge => generatePosChallenge({ rng: createRng(seed), variantId, difficulty: "easy" });

/** Manual scheduler + a clock that moves 1 ms every time it is read. */
function harness(challenge: PosChallenge, extra: PosRunnerOptions = {}) {
  let clock = 0;
  const handles = new Map<number, () => void>();
  const queue: number[] = [];
  let id = 0;
  const calls = { progress: [] as number[], done: [] as PosDone[], cancel: 0, error: 0 };
  const runner = createPosRunner(
    challenge,
    { onProgress: (n) => calls.progress.push(n), onDone: (d) => calls.done.push(d), onCancel: () => void calls.cancel++, onError: () => void calls.error++ },
    {
      now: () => clock++,
      schedule: (fn) => {
        const h = ++id;
        handles.set(h, fn);
        queue.push(h);
        return h;
      },
      clear: (h) => void handles.delete(h as number),
      ...extra,
    },
  );
  const step = (): boolean => {
    while (queue.length > 0) {
      const h = queue.shift()!;
      const fn = handles.get(h);
      if (!fn) continue;
      handles.delete(h);
      fn();
      return true;
    }
    return false;
  };
  const drain = (): number => {
    let n = 0;
    while (step() && n < 10_000) n++;
    return n;
  };
  return { runner, calls, step, drain, pending: () => handles.size };
}

describe("pos runner", () => {
  it("fills in several slices and produces a proof the verifier accepts (both kinds)", () => {
    for (const kind of ["sampled", "checksum"]) {
      const c = make(kind);
      const h = harness(c, { sliceMs: 3 });
      h.runner.start();
      const slices = h.drain();
      expect(slices).toBeGreaterThan(1); // chunked, not one blocking call
      expect(h.calls.done).toHaveLength(1);
      const done = h.calls.done[0]!;
      expect(verifyPosAnswer(c, done.proof).passed).toBe(true);
      expect(done.run.allocatedBytes).toBe(c.bytes);
      expect(done.run.operations).toBeGreaterThanOrEqual(c.bytes);
    }
  });
  it("progress is throttled and never exceeds the buffer", () => {
    const c = make("sampled");
    const h = harness(c, { sliceMs: 2, progressMs: 50 });
    h.runner.start();
    const slices = h.drain();
    expect(h.calls.progress.length).toBeLessThan(slices);
    expect(h.calls.progress.every((n) => n <= c.bytes)).toBe(true);
  });
  it("cancel stops the work, calls onCancel once and schedules nothing more", () => {
    const h = harness(make("checksum"), { sliceMs: 2 });
    h.runner.start();
    h.step();
    h.runner.cancel();
    h.runner.cancel();
    expect(h.calls.cancel).toBe(1);
    expect(h.pending()).toBe(0);
    expect(h.drain()).toBe(0);
    expect(h.calls.done).toHaveLength(0);
  });
  it("a disposed runner never calls a hook (stale run is harmless)", () => {
    const h = harness(make("sampled"), { sliceMs: 2 });
    h.runner.start();
    h.step();
    h.runner.dispose();
    h.drain();
    expect(h.calls.done).toHaveLength(0);
    expect(h.calls.cancel).toBe(0);
    expect(h.calls.progress.length + h.calls.error).toBeLessThanOrEqual(1);
  });
  it("is one run only: a second start does nothing", () => {
    const h = harness(make("sampled"), { sliceMs: 50 });
    h.runner.start();
    h.runner.start();
    h.drain();
    h.runner.start();
    h.drain();
    expect(h.calls.done).toHaveLength(1);
  });
  it("refuses an out-of-bounds challenge without allocating it", () => {
    const huge = { ...make("sampled"), bytes: MAX_SPACE_BYTES * 64 };
    const h = harness(huge);
    h.runner.start();
    expect(h.calls.error).toBe(1);
    expect(h.pending()).toBe(0);
    expect(h.calls.done).toHaveLength(0);
  });
  it("never allocates more than the challenge asks for", () => {
    const sizes: number[] = [];
    const Real = globalThis.Uint8Array;
    class Spy extends Real {
      constructor(n: number) {
        super(n);
        sizes.push(n);
      }
    }
    (globalThis as { Uint8Array: unknown }).Uint8Array = Spy;
    try {
      const c = make("checksum");
      const h = harness(c, { sliceMs: 50 });
      h.runner.start();
      h.drain();
      expect(sizes).toEqual([c.bytes]);
    } finally {
      (globalThis as { Uint8Array: unknown }).Uint8Array = Real;
    }
  });
});
