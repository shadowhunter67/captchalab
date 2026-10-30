import { hash32 } from "../proof-of-space/space";
import type { BcCheckId } from "./types";

export const MIN_WORKLOAD = 1_000;
export const MAX_WORKLOAD = 200_000;

/** A small deterministic loop: the page runs it, the verifier recomputes it. */
export function computeLocal(seed: number, workload: number): number {
  let x = seed >>> 0;
  for (let i = 0; i < workload; i++) x = hash32(x, i);
  return x >>> 0;
}

/** The only thing read from the environment is whether a name exists. */
export type CapabilityEnv = Readonly<Record<string, unknown>>;

const exists = (env: CapabilityEnv, name: string): boolean => typeof env[name] !== "undefined";

/**
 * Availability of one API, as a boolean. Nothing is called, constructed or read from the APIs, and nothing but true
 * or false is returned: no version, vendor, size, renderer or device detail.
 */
export function probeCapability(env: CapabilityEnv, id: Exclude<BcCheckId, "compute">): boolean {
  switch (id) {
    case "javascript":
      return true; // this code is running
    case "webcrypto": {
      const c = env.crypto;
      return typeof c === "object" && c !== null && typeof (c as { subtle?: unknown }).subtle !== "undefined";
    }
    case "canvas":
      return exists(env, "HTMLCanvasElement") && exists(env, "CanvasRenderingContext2D");
    case "worker":
      return exists(env, "Worker");
    case "webaudio":
      return exists(env, "AudioContext") || exists(env, "webkitAudioContext");
    case "pointer":
      return exists(env, "PointerEvent");
  }
}
