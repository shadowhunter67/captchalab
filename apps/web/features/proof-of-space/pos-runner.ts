import { CHECKSUM_START, MAX_SPACE_BYTES, checksumUpdate, fillRange, isPosChallenge, samplePositions, type PosAnswer, type PosChallenge, type PosRun } from "@captchalab/captcha-plugins";

export interface PosDone {
  proof: PosAnswer;
  run: PosRun;
}

export interface PosRunnerHooks {
  /** Throttled: called at most about every progressMs, never once per byte. */
  onProgress: (filledBytes: number) => void;
  onDone: (done: PosDone) => void;
  onCancel: () => void;
  /** The buffer could not be allocated (or the challenge is out of bounds). */
  onError: () => void;
}

export interface PosRunnerOptions {
  now?: () => number;
  schedule?: (fn: () => void) => unknown;
  clear?: (handle: unknown) => void;
  /** Bytes filled per step. */
  chunk?: number;
  /** Most work per slice before yielding to the event loop. */
  sliceMs?: number;
  progressMs?: number;
}

export interface PosRunner {
  start(): void;
  cancel(): void;
  dispose(): void;
}

export const POS_CHUNK = 64 * 1024;
export const POS_SLICE_MS = 12;
export const POS_PROGRESS_MS = 100;

type State = "idle" | "running" | "finished";

/**
 * Allocates ONE buffer of challenge.bytes (never more than MAX_SPACE_BYTES), fills it in small chunks, derives the
 * proof from the buffer, and releases the buffer. It yields to the event loop between slices, so the page stays
 * responsive and Cancel works. One run only. A finished, cancelled or disposed runner never calls a hook again and
 * has dropped its buffer.
 */
export function createPosRunner(challenge: PosChallenge, hooks: PosRunnerHooks, options: PosRunnerOptions = {}): PosRunner {
  const now = options.now ?? (() => performance.now());
  const schedule = options.schedule ?? ((fn: () => void): unknown => setTimeout(fn, 0));
  const clear = options.clear ?? ((h: unknown): void => clearTimeout(h as ReturnType<typeof setTimeout>));
  const chunk = options.chunk ?? POS_CHUNK;
  const sliceMs = options.sliceMs ?? POS_SLICE_MS;
  const progressMs = options.progressMs ?? POS_PROGRESS_MS;

  let state: State = "idle";
  let token = 0;
  let handle: unknown = null;
  let buf: Uint8Array | null = null;
  let filled = 0;
  let phase: "fill" | "proof" = "fill";
  let sum = CHECKSUM_START;
  let proofAt = 0;
  let startedAt = 0;
  let fillDoneAt = 0;
  let lastProgressAt = 0;

  const release = (): void => {
    if (handle !== null) clear(handle);
    handle = null;
    buf = null;
  };

  const finishRun = (): void => {
    const b = buf as Uint8Array;
    const proofStart = now();
    let proof: PosAnswer;
    if (challenge.kind === "sample") {
      proof = { samples: samplePositions(challenge.seed, challenge.bytes, challenge.sampleCount).map((p) => b[p] as number) };
    } else {
      proof = { checksum: sum };
    }
    const end = now();
    const reads = challenge.kind === "sample" ? challenge.sampleCount : challenge.bytes;
    const run: PosRun = { allocatedBytes: challenge.bytes, fillMs: fillDoneAt - startedAt, proofMs: end - proofStart, operations: challenge.bytes + reads };
    state = "finished";
    release();
    hooks.onDone({ proof, run });
  };

  const slice = (myToken: number): void => {
    if (myToken !== token || state !== "running" || buf === null) return;
    handle = null;
    const sliceStart = now();
    do {
      if (phase === "fill") {
        const to = Math.min(challenge.bytes, filled + chunk);
        fillRange(buf, challenge.seed, filled, to);
        filled = to;
        if (filled >= challenge.bytes) {
          fillDoneAt = now();
          phase = "proof";
        }
      } else {
        // The checksum is read back from the buffer in chunks too; a sample proof needs no pass.
        if (challenge.kind === "checksum" && proofAt < challenge.bytes) {
          const to = Math.min(challenge.bytes, proofAt + chunk * 4);
          sum = checksumUpdate(sum, buf, proofAt, to);
          proofAt = to;
          if (proofAt < challenge.bytes) continue;
        }
        finishRun();
        return;
      }
    } while (now() - sliceStart < sliceMs);
    const t = now();
    if (t - lastProgressAt >= progressMs) {
      lastProgressAt = t;
      hooks.onProgress(filled);
      if (myToken !== token || state !== "running") return; // a hook may have cancelled or disposed
    }
    handle = schedule(() => slice(myToken));
  };

  return {
    start() {
      if (state !== "idle") return;
      if (!isPosChallenge(challenge)) {
        state = "finished";
        hooks.onError();
        return;
      }
      try {
        buf = new Uint8Array(challenge.bytes);
      } catch {
        state = "finished";
        hooks.onError();
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
      release();
      hooks.onCancel();
    },
    dispose() {
      state = "finished";
      token += 1;
      release();
    },
  };
}
