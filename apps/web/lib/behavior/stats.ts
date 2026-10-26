import { mean, variance } from "@captchalab/captcha-core";

/** Gaps between consecutive times (ms). Non-positive gaps are kept: callers decide what they mean. */
export function gaps(times: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i++) out.push((times[i] as number) - (times[i - 1] as number));
  return out;
}

/**
 * Coefficient of variation (population std / mean) of positive values. null with fewer than `min`
 * values or a non-positive mean: a ratio of nothing is not zero.
 */
export function cv(values: readonly number[], min = 3): number | null {
  if (values.length < min) return null;
  const m = mean(values);
  if (!(m > 0)) return null;
  return Math.sqrt(variance(values)) / m;
}

/** Number of sign changes of consecutive steps, ignoring steps whose size is below `minStep`. */
export function reversals(steps: readonly number[], minStep = 0): number {
  let prev = 0;
  let n = 0;
  for (const s of steps) {
    if (Math.abs(s) <= minStep) continue;
    const sign = Math.sign(s);
    if (prev !== 0 && sign !== prev) n++;
    prev = sign;
  }
  return n;
}

export const round = (n: number, digits = 3): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
