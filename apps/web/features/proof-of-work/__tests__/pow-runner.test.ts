import { describe, expect, it } from "vitest";
import { createRng } from "@captchalab/captcha-core";
import { generatePowChallenge, searchNonces } from "@captchalab/captcha-plugins";
import { createPowRunner, type PowFound, type PowRunnerOptions } from "../pow-runner";

const challenge = generatePowChallenge({ rng: createRng(5), variantId: "hash-prefix", difficulty: "easy" });

/** Manual scheduler + a clock that moves 1 ms every time it is read. */
function harness(extra: PowRunnerOptions = {}) {
  let clock = 0;
  const handles = new Map<number, () => void>();
  const queue: number[] = [];
  let id = 0;
  const calls = { progress: [] as number[], found: [] as PowFound[], cancel: 0 };
  const options: PowRunnerOptions = {
    now: () => clock++,
    schedule: (fn) => {
      const h = ++id;
      handles.set(h, fn);
      queue.push(h);
      return h;
    },
    clear: (h) => void handles.delete(h as number),
    ...extra,
  };
  const hooks = {
    onProgress: (n: number) => calls.progress.push(n),
    onFound: (f: PowFound) => calls.found.push(f),
    onCancel: () => void calls.cancel++,
  };
  /** Runs the next scheduled slice, if it was not cleared. Returns false when nothing is left. */
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
  const drain = (max = 1_000_000): number => {
    let n = 0;
    while (n < max && step()) n++;
    return n;
  };
  return { options, hooks, calls, step, drain, pending: () => handles.size };
}

describe("createPowRunner", () => {
  it("finds the same nonce as a direct search, and reports nonce + 1 iterations", () => {
    const expected = searchNonces(challenge, 0, 5_000_000)!;
    const h = harness({ chunk: 50 });
    createPowRunner(challenge, h.hooks, h.options).start();
    h.drain();
    expect(h.calls.found).toHaveLength(1);
    expect(h.calls.found[0]!.nonce).toBe(expected);
    expect(h.calls.found[0]!.iterations).toBe(expected + 1);
    expect(h.calls.found[0]!.computationMs).toBeGreaterThan(0);
    expect(h.calls.cancel).toBe(0);
  });

  it("does no work until the scheduler runs", () => {
    const h = harness({ chunk: 50 });
    createPowRunner(challenge, h.hooks, h.options).start();
    expect(h.pending()).toBe(1);
    expect(h.calls.found).toHaveLength(0);
  });

  it("yields between slices and each slice stays near the budget", () => {
    // The clock ticks once per read, so a 3 ms budget allows only a few chunks of 5 hashes per slice.
    const h = harness({ chunk: 5, sliceMs: 3, progressMs: 1_000_000 });
    createPowRunner(challenge, h.hooks, h.options).start();
    const slices = h.drain();
    const hashes = h.calls.found[0]!.iterations;
    expect(slices).toBeGreaterThan(1);
    expect(hashes / slices).toBeLessThanOrEqual(5 * 4); // at most about 4 chunks per slice
  });

  it("cancel stops further slices and calls onCancel exactly once", () => {
    const h = harness({ chunk: 5, sliceMs: 2 });
    const runner = createPowRunner(challenge, h.hooks, h.options);
    runner.start();
    h.step();
    runner.cancel();
    runner.cancel();
    expect(h.pending()).toBe(0);
    expect(h.drain()).toBe(0);
    expect(h.calls.cancel).toBe(1);
    expect(h.calls.found).toHaveLength(0);
  });

  it("ignores a second start while running", () => {
    const h = harness({ chunk: 50 });
    const runner = createPowRunner(challenge, h.hooks, h.options);
    runner.start();
    runner.start();
    expect(h.pending()).toBe(1);
    h.drain();
    expect(h.calls.found).toHaveLength(1);
  });

  it("dispose silences everything, including a pending slice", () => {
    const h = harness({ chunk: 5, sliceMs: 2 });
    const runner = createPowRunner(challenge, h.hooks, h.options);
    runner.start();
    h.step();
    runner.dispose();
    runner.cancel();
    expect(h.drain()).toBe(0);
    expect(h.calls.cancel).toBe(0);
    expect(h.calls.found).toHaveLength(0);
  });

  it("throttles progress: far fewer calls than hashes", () => {
    const h = harness({ chunk: 5, sliceMs: 2, progressMs: 50 });
    createPowRunner(challenge, h.hooks, h.options).start();
    h.drain();
    const hashes = h.calls.found[0]!.iterations;
    expect(h.calls.progress.length).toBeLessThan(hashes / 10);
    for (let i = 1; i < h.calls.progress.length; i++) expect(h.calls.progress[i]!).toBeGreaterThan(h.calls.progress[i - 1]!);
  });

  it("a finished runner cannot be started or cancelled again", () => {
    const h = harness({ chunk: 50 });
    const runner = createPowRunner(challenge, h.hooks, h.options);
    runner.start();
    h.drain();
    runner.start();
    runner.cancel();
    expect(h.drain()).toBe(0);
    expect(h.calls.found).toHaveLength(1);
    expect(h.calls.cancel).toBe(0);
  });
});
