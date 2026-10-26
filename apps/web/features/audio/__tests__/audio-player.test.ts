import { describe, expect, it, vi } from "vitest";
import type { AudioChallenge } from "@captchalab/captcha-plugins";
import { createAudioPlayer, scheduleStarts, type AudioBufferLike, type AudioContextLike, type SourceNodeLike } from "../audio-player";

class FakeSource implements SourceNodeLike {
  buffer: AudioBufferLike | null = null;
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  stopped = false;
  target: unknown = null;
  connect(d: unknown) {
    this.target = d;
    return d;
  }
  start(when?: number) {
    this.startedAt = when ?? 0;
  }
  stop() {
    this.stopped = true;
  }
}
class FakeGain {
  gain = { value: 1 };
  target: unknown = null;
  connect(d: unknown) {
    this.target = d;
    return d;
  }
}
class FakeContext implements AudioContextLike {
  currentTime = 10;
  sampleRate = 1000;
  destination = { dest: true };
  closed = false;
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  buffers: AudioBufferLike[] = [];
  createBuffer(_c: number, length: number): AudioBufferLike {
    const data = new Float32Array(length);
    const b = { duration: length / 1000, getChannelData: () => data };
    this.buffers.push(b);
    return b;
  }
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike> {
    return Promise.resolve({ duration: new Uint8Array(data)[0]! / 10, getChannelData: () => new Float32Array(0) });
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

const challenge = (over: Partial<AudioChallenge> = {}): AudioChallenge => ({ id: "a", digits: "1212", gapMs: 500, noiseLevel: 0, noiseSeed: 7, ...over });
// digit d lasts 0.d s: "1" = 0.1 s, "2" = 0.2 s
const clip = (url: string): Promise<ArrayBuffer> => Promise.resolve(new Uint8Array([Number(url.slice(-1))]).buffer);
const setup = (c: AudioChallenge, extra: Record<string, unknown> = {}) => {
  const ctx = new FakeContext();
  const hooks = { onStateChange: vi.fn(), onError: vi.fn(), onEnded: vi.fn() };
  const player = createAudioPlayer(c, { createContext: () => ctx, fetchClip: clip, urlFor: (d) => `clip/${d}`, ...hooks, ...extra });
  return { ctx, hooks, player };
};

describe("audio player", () => {
  it("schedules clips back to back with the gap and a lead-in", async () => {
    const { ctx, player } = setup(challenge());
    await player.play();
    const speech = ctx.sources.slice(0, 4).map((s) => s.startedAt!);
    expect(speech[0]).toBeCloseTo(10.05);
    expect(speech[1]).toBeCloseTo(10.05 + 0.1 + 0.5);
    expect(speech[2]).toBeCloseTo(10.05 + 0.1 + 0.5 + 0.2 + 0.5);
    expect(scheduleStarts([0.1, 0.2], 500, 0)).toEqual([0.05, 0.05 + 0.1 + 0.5]);
  });

  it("adds noise only when noiseLevel > 0, with gain equal to it", async () => {
    const quiet = setup(challenge());
    await quiet.player.play();
    expect(quiet.ctx.sources).toHaveLength(4);
    expect(quiet.ctx.gains).toHaveLength(1); // master only

    const noisy = setup(challenge({ noiseLevel: 0.06 }));
    await noisy.player.play();
    expect(noisy.ctx.sources).toHaveLength(5);
    expect(noisy.ctx.gains.map((g) => g.gain.value)).toContain(0.06);
    expect(noisy.ctx.gains[0]!.gain.value).toBeLessThanOrEqual(0.8);
  });

  it("never lets the noise gain exceed 0.12", async () => {
    const { ctx, player } = setup(challenge({ noiseLevel: 0.5 }));
    await player.play();
    expect(Math.max(...ctx.gains.slice(1).map((g) => g.gain.value))).toBe(0.12);
  });

  it("replay stops the previous sources so playbacks never overlap", async () => {
    const { ctx, player } = setup(challenge({ noiseLevel: 0.03 }));
    await player.play();
    const first = [...ctx.sources];
    await player.play();
    expect(first.every((s) => s.stopped)).toBe(true);
    expect(ctx.sources.slice(first.length).every((s) => !s.stopped)).toBe(true);
  });

  it("ignores a stale fetch result after a newer play", async () => {
    const releases: (() => void)[] = [];
    let calls = 0;
    const fetchClip = (url: string): Promise<ArrayBuffer> => {
      calls++;
      if (calls <= 2) return new Promise((r) => releases.push(() => r(new Uint8Array([Number(url.slice(-1))]).buffer)));
      return clip(url);
    };
    const { ctx, player, hooks } = setup(challenge({ digits: "12" }), { fetchClip });
    const slow = player.play(); // waits for the first fetch(es)
    const fast = player.play(); // newer play, resolves immediately from cache-less fetches
    await fast;
    releases.forEach((r) => r());
    await slow;
    expect(ctx.sources).toHaveLength(2); // only the newer playback was scheduled
    expect(hooks.onError).not.toHaveBeenCalled();
  });

  it("stop() silences the sources and returns to idle", async () => {
    const { ctx, player, hooks } = setup(challenge());
    await player.play();
    player.stop();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
    expect(hooks.onStateChange).toHaveBeenLastCalledWith("idle");
  });

  it("dispose stops everything, closes the context and silences the hooks", async () => {
    const { ctx, player, hooks } = setup(challenge());
    await player.play();
    hooks.onStateChange.mockClear();
    player.dispose();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
    expect(ctx.closed).toBe(true);
    await player.play();
    player.stop();
    expect(hooks.onStateChange).not.toHaveBeenCalled();
    expect(hooks.onError).not.toHaveBeenCalled();
    expect(ctx.sources).toHaveLength(4);
  });

  it("a missing clip reports missing and returns to idle without throwing", async () => {
    const { hooks, player } = setup(challenge(), { fetchClip: async () => Promise.reject(new Error("404")) });
    await expect(player.play()).resolves.toBeUndefined();
    expect(hooks.onError).toHaveBeenCalledWith("missing");
    expect(hooks.onStateChange).toHaveBeenLastCalledWith("idle");
  });

  it("reports unsupported when there is no AudioContext", async () => {
    const { hooks, player } = setup(challenge(), { createContext: () => null });
    await player.play();
    expect(hooks.onError).toHaveBeenCalledWith("unsupported");
  });

  it("fires onEnded when the last clip finishes", async () => {
    const { ctx, player, hooks } = setup(challenge());
    await player.play();
    ctx.sources[3]!.onended?.();
    expect(hooks.onEnded).toHaveBeenCalledTimes(1);
    expect(hooks.onStateChange).toHaveBeenLastCalledWith("idle");
  });

  it("the same challenge always sounds the same (identical noise samples)", async () => {
    const a = setup(challenge({ noiseLevel: 0.06, noiseSeed: 99 }));
    const b = setup(challenge({ noiseLevel: 0.06, noiseSeed: 99 }));
    const c = setup(challenge({ noiseLevel: 0.06, noiseSeed: 100 }));
    await a.player.play();
    await b.player.play();
    await c.player.play();
    const noise = (x: FakeContext) => Array.from(x.buffers[0]!.getChannelData(0));
    expect(noise(a.ctx)).toEqual(noise(b.ctx));
    expect(noise(a.ctx)).not.toEqual(noise(c.ctx));
    expect(Math.max(...noise(a.ctx).map(Math.abs))).toBeLessThanOrEqual(1);
  });
});
