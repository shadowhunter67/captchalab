import type { BaseCaptchaFeatures } from "../features/motion";
import type { AnyCaptchaPlugin, CaptchaPlugin } from "./types";

export interface PluginRegistry {
  register<C, A, F extends BaseCaptchaFeatures>(plugin: CaptchaPlugin<C, A, F>): void;
  get(id: string): AnyCaptchaPlugin | undefined;
  list(): readonly AnyCaptchaPlugin[];
}

/** Instance-scoped (no global mutable state). Duplicate ids throw. */
export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, AnyCaptchaPlugin>();
  return {
    register(plugin) {
      if (plugins.has(plugin.id)) {
        throw new Error(`CAPTCHA plugin already registered: ${plugin.id}`);
      }
      plugins.set(plugin.id, plugin as unknown as AnyCaptchaPlugin);
    },
    get: (id) => plugins.get(id),
    list: () => [...plugins.values()],
  };
}

/** Deterministic PRNG (mulberry32), returns values in [0, 1). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
