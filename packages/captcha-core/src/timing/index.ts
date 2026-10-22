export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Population variance (divide by n). 0 for empty input. */
export function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}

/** Largest value; 0 for empty input. */
export function max(values: readonly number[]): number {
  let best = 0;
  for (const v of values) if (v > best) best = v;
  return best;
}
