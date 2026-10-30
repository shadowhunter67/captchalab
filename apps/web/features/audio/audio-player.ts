import { createRng } from "@captchalab/captcha-core";
import { clipPath, type AudioChallenge } from "@captchalab/captcha-plugins";
import { assetUrl } from "@/lib/asset-url";

/** Structural subsets of the Web Audio API, so tests need no DOM. */
export interface AudioBufferLike {
  duration: number;
  getChannelData(channel: number): Float32Array;
}
export interface AudioNodeLike {
  connect(destination: unknown): unknown;
}
export interface GainNodeLike extends AudioNodeLike {
  gain: { value: number };
}
export interface SourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(): void;
}
export interface AudioContextLike {
  currentTime: number;
  sampleRate: number;
  destination: unknown;
  state?: string;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  createBufferSource(): SourceNodeLike;
  createGain(): GainNodeLike;
  resume?(): Promise<void>;
  close(): Promise<void>;
}

export type PlayerState = "idle" | "loading" | "playing";
/** missing: a clip could not be loaded. unsupported: no Web Audio. unavailable: the context exists but audio output never started (for example no audio device). */
export type PlayerError = "missing" | "unsupported" | "unavailable";

/** How long to wait for a suspended context to start running before reporting that audio output is unavailable. */
export const RESUME_WAIT_MS = 2500;

export interface PlayerDeps {
  createContext: () => AudioContextLike | null;
  fetchClip: (url: string) => Promise<ArrayBuffer>;
  urlFor: (digit: string) => string;
  /** Resolves after `ms`. Injectable so tests need no real timers. */
  wait?: (ms: number) => Promise<void>;
  onStateChange?: (state: PlayerState) => void;
  onError?: (kind: PlayerError) => void;
  onEnded?: () => void;
}

export interface AudioPlayer {
  play(): Promise<void>;
  stop(): void;
  dispose(): void;
}

export const MASTER_GAIN = 0.8;
export const MAX_NOISE_GAIN = 0.12;
export const LEAD_IN_S = 0.05;

/** Start time (s, relative to the context clock) of every clip: durations plus the gap, after a short lead-in. */
export function scheduleStarts(durations: readonly number[], gapMs: number, origin: number): number[] {
  const out: number[] = [];
  let t = origin + LEAD_IN_S;
  for (const d of durations) {
    out.push(t);
    t += d + gapMs / 1000;
  }
  return out;
}

/** Seeded white noise in [-1, 1): the same seed always gives the same samples. */
export function fillNoise(target: Float32Array, seed: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < target.length; i++) target[i] = rng() * 2 - 1;
}

export function defaultDeps(): Pick<PlayerDeps, "createContext" | "fetchClip" | "urlFor"> {
  return {
    createContext: () => {
      const w = globalThis as unknown as { AudioContext?: new () => AudioContextLike; webkitAudioContext?: new () => AudioContextLike };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      return Ctor ? new Ctor() : null;
    },
    fetchClip: async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("clip not available");
      return res.arrayBuffer();
    },
    urlFor: (digit) => assetUrl(clipPath(digit)),
  };
}

/**
 * Plays the digits of a challenge with the Web Audio API from the local clips. The context is created on the first
 * play() (a user gesture) and closed on dispose(). Playbacks never overlap: play() and stop() first stop every
 * source of the previous one, and a token makes late fetch/decode results of an older play() do nothing.
 * Never uses the microphone or speech synthesis.
 */
export function createAudioPlayer(challenge: AudioChallenge, deps: Partial<PlayerDeps> = {}): AudioPlayer {
  const d = { ...defaultDeps(), ...deps };
  let ctx: AudioContextLike | null = null;
  let token = 0;
  let disposed = false;
  let state: PlayerState = "idle";
  let sources: SourceNodeLike[] = [];
  const cache = new Map<string, AudioBufferLike>();
  // In-flight loads are shared, so rapid Replay presses never fetch or decode the same clip twice.
  const loading = new Map<string, Promise<AudioBufferLike>>();

  const setState = (s: PlayerState): void => {
    if (disposed || state === s) return;
    state = s;
    d.onStateChange?.(s);
  };

  const silence = (): void => {
    for (const s of sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* never started or already stopped */
      }
    }
    sources = [];
  };

  const loadClip = async (digit: string, c: AudioContextLike): Promise<AudioBufferLike> => {
    const hit = cache.get(digit);
    if (hit) return hit;
    const pending = loading.get(digit);
    if (pending) return pending;
    const job = (async () => {
      try {
        const buf = await c.decodeAudioData(await d.fetchClip(d.urlFor(digit)));
        cache.set(digit, buf);
        return buf;
      } finally {
        loading.delete(digit);
      }
    })();
    loading.set(digit, job);
    return job;
  };

  return {
    async play() {
      if (disposed) return;
      silence();
      const mine = ++token;
      if (!ctx) {
        try {
          ctx = d.createContext();
        } catch {
          ctx = null;
        }
        if (!ctx) {
          setState("idle");
          d.onError?.("unsupported");
          return;
        }
      }
      const c = ctx;
      setState("loading");
      let buffers: AudioBufferLike[];
      let unavailable = false;
      try {
        // resume() never settles when the device has no audio output, so it must not gate loading: the clips load
        // meanwhile, and the wait for output is bounded.
        const resuming: Promise<unknown> = c.state === "suspended" ? Promise.resolve(c.resume?.()).catch(() => undefined) : Promise.resolve();
        const distinct = [...new Set(challenge.digits.split(""))];
        await Promise.all(distinct.map((digit) => loadClip(digit, c)));
        buffers = challenge.digits.split("").map((digit) => cache.get(digit)!);
        const wait = d.wait ?? ((ms: number) => new Promise<void>((resolve) => void setTimeout(resolve, ms)));
        await Promise.race([resuming, wait(RESUME_WAIT_MS)]);
        if (c.state === "suspended") unavailable = true;
      } catch {
        if (mine === token && !disposed) {
          setState("idle");
          d.onError?.("missing");
        }
        return;
      }
      if (mine !== token || disposed) return; // a newer play/stop/dispose superseded this one
      if (unavailable) {
        setState("idle");
        d.onError?.("unavailable");
        return;
      }
      try {
        const starts = scheduleStarts(
          buffers.map((b) => b.duration),
          challenge.gapMs,
          c.currentTime,
        );
        const master = c.createGain();
        master.gain.value = MASTER_GAIN;
        master.connect(c.destination);
        const made: SourceNodeLike[] = [];
        sources = made; // registered up front: if a later step throws, silence() still stops what already started
        buffers.forEach((b, i) => {
          const src = c.createBufferSource();
          src.buffer = b;
          src.connect(master);
          made.push(src);
          src.start(starts[i]);
        });
        const first = starts[0] ?? c.currentTime;
        const end = (starts.at(-1) ?? first) + (buffers.at(-1)?.duration ?? 0);
        if (challenge.noiseLevel > 0) {
          const length = Math.max(1, Math.ceil((end - c.currentTime + LEAD_IN_S) * c.sampleRate));
          const nb = c.createBuffer(1, length, c.sampleRate);
          fillNoise(nb.getChannelData(0), challenge.noiseSeed);
          const noise = c.createBufferSource();
          noise.buffer = nb;
          const g = c.createGain();
          g.gain.value = Math.min(challenge.noiseLevel, MAX_NOISE_GAIN);
          noise.connect(g);
          g.connect(master);
          made.push(noise);
          noise.start(c.currentTime);
        }
        const lastSpeech = made[buffers.length - 1];
        if (lastSpeech) {
          lastSpeech.onended = () => {
            if (mine !== token || disposed) return;
            silence();
            setState("idle");
            d.onEnded?.();
          };
        }
        setState("playing");
      } catch {
        silence();
        if (mine === token && !disposed) {
          setState("idle");
          d.onError?.("missing");
        }
      }
    },
    stop() {
      if (disposed) return;
      token++;
      silence();
      setState("idle");
    },
    dispose() {
      if (disposed) return;
      token++;
      silence();
      disposed = true;
      const c = ctx;
      ctx = null;
      if (c) void Promise.resolve(c.close()).catch(() => undefined);
    },
  };
}
