/**
 * The deterministic "space" of a Proof of Space challenge. Byte i of the buffer is a pure function of (seed, i), so:
 *   - a prover can fill a real buffer in chunks and read the proof back from it;
 *   - a verifier can recompute any byte, or the whole checksum, WITHOUT allocating the buffer.
 * This is an educational simulation of "work that uses memory", not a storage-hard cryptographic protocol.
 */

/** Smallest and largest buffer a challenge may ask for. The verifier rejects anything outside, so a malformed
 * challenge can never make the page allocate a huge buffer. */
export const MIN_SPACE_BYTES = 64 * 1024;
export const MAX_SPACE_BYTES = 8 * 1024 * 1024;
export const MIN_SAMPLES = 8;
export const MAX_SAMPLES = 64;

/** 32-bit integer hash (a counter-based mix, not cryptographic). */
export function hash32(seed: number, i: number): number {
  let x = (seed ^ Math.imul((i + 0x9e3779b9) | 0, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export const byteAt = (seed: number, i: number): number => hash32(seed, i) & 255;

/** Writes bytes [from, to) of the space into `buf`. */
export function fillRange(buf: Uint8Array, seed: number, from: number, to: number): void {
  for (let i = from; i < to; i++) buf[i] = hash32(seed, i) & 255;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
export const CHECKSUM_START = FNV_OFFSET;

/** FNV-1a over buf[from, to), continuing from `state`. */
export function checksumUpdate(state: number, buf: Uint8Array, from: number, to: number): number {
  let h = state >>> 0;
  for (let i = from; i < to; i++) h = Math.imul(h ^ (buf[i] as number), FNV_PRIME) >>> 0;
  return h;
}

/** The same checksum, computed from the seed alone (no buffer). */
export function checksumOfSpace(seed: number, bytes: number): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes; i++) h = Math.imul(h ^ (hash32(seed, i) & 255), FNV_PRIME) >>> 0;
  return h;
}

/** The positions a "sample" proof must report, derived from the seed (so the prover cannot choose them). */
export function samplePositions(seed: number, bytes: number, count: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < count; j++) out.push(hash32((seed ^ 0xa5a5a5a5) >>> 0, j) % bytes);
  return out;
}

export const sampleValues = (seed: number, positions: readonly number[]): number[] => positions.map((p) => byteAt(seed, p));
