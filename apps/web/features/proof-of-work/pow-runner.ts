import { isPowChallenge, searchNonces, type PowChallenge } from "@captchalab/captcha-plugins";

export interface PowFound {
  nonce: number;
  /** Hashes computed, counting the one that succeeded (nonce + 1). */
  iterations: number;
  computationMs: number;
}

export interface PowRunnerHooks {
  /** Throttled: called at most about every progressMs, never once per hash. */
  onProgress: (iterations: number) => void;
  onFound: (found: PowFound) => void;
  onCancel: () => void;
  /** The challenge is malformed and was refused before any work. Optional: a runner for a generated challenge never needs it. */
  onError?: () => void;
}

export interface PowRunnerOptions {
  now?: () => number;
  schedule?: (fn: () => void) => unknown;
  clear?: (handle: unknown) => void;
  /** Hashes per chunk. */
  chunk?: number;
  /** Most work per slice before yielding to the event loop. */
  sliceMs?: number;
  /** Minimum time between progress calls. */
  progressMs?: number;
}

export interface PowRunner {
  start(): void;
  cancel(): void;
  dispose(): void;
}

export const POW_CHUNK = 1500;
export const POW_SLICE_MS = 12;
export const POW_PROGRESS_MS = 100;

type State = "idle" | "running" | "finished";

/**
 * Searches nonces from 0 in small chunks and yields to the event loop between slices, so the page stays responsive
 * and Cancel works. One run only. A finished, cancelled or disposed runner never calls a hook again.
 */
export function createPowRunner(challenge: PowChallenge, hooks: PowRunnerHooks, options: PowRunnerOptions = {}): PowRunner {
  const now = options.now ?? (() => performance.now());
  const schedule = options.schedule ?? ((fn: () => void): unknown => setTimeout(fn, 0));
  const clear = options.clear ?? ((h: unknown): void => clearTimeout(h as ReturnType<typeof setTimeout>));
  const chunk = options.chunk ?? POW_CHUNK;
  const sliceMs = options.sliceMs ?? POW_SLICE_MS;
  const progressMs = options.progressMs ?? POW_PROGRESS_MS;

  let state: State = "idle";
  let token = 0;
  let handle: unknown = null;
  let next = 0;
  let startedAt = 0;
  let lastProgressAt = 0;

  const stopTimer = (): void => {
    if (handle !== null) clear(handle);
    handle = null;
  };

  const slice = (myToken: number): void => {
    if (myToken !== token || state !== "running") return;
    handle = null;
    const sliceStart = now();
    do {
      const found = searchNonces(challenge, next, chunk);
      if (found !== null) {
        state = "finished";
        hooks.onFound({ nonce: found, iterations: found + 1, computationMs: now() - startedAt });
        return;
      }
      next += chunk;
    } while (now() - sliceStart < sliceMs);
    const t = now();
    if (t - lastProgressAt >= progressMs) {
      lastProgressAt = t;
      hooks.onProgress(next);
      if (myToken !== token || state !== "running") return; // a hook may have cancelled or disposed
    }
    handle = schedule(() => slice(myToken));
  };

  return {
    start() {
      if (state !== "idle") return;
      if (!isPowChallenge(challenge)) {
        state = "finished"; // no hashing for a malformed challenge (it could never finish)
        hooks.onError?.();
        return;
      }
      state = "running";
      token += 1;
      const myToken = token;
      startedAt = now();
      lastProgressAt = startedAt;
      handle = schedule(() => slice(myToken));
    },
    cancel() {
      if (state !== "running") return;
      state = "finished";
      token += 1;
      stopTimer();
      hooks.onCancel();
    },
    dispose() {
      state = "finished";
      token += 1;
      stopTimer();
    },
  };
}
