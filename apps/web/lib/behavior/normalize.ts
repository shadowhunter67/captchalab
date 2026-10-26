/**
 * "Experimental normalized signal": a value mapped onto 0..1 by a CONFIGURED range (lo, hi) for that signal.
 * The ranges are hand-set baselines chosen by the lab authors. They are not learned from a population, so a
 * normalized value says where a number sits inside that configured range and nothing about how common it is
 * among real people (it is NOT a percentile).
 *
 * 1 = the end of the range the rule reads as "human-like", 0 = the end it reads as "synthetic-like".
 * `lowIsHuman` flips the direction for signals where a LOW raw value is the human-like end.
 */
export function normalizeRange(value: number | null | undefined, lo: number, hi: number, lowIsHuman = false): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (!(hi > lo)) throw new RangeError("normalizeRange needs hi > lo");
  const n = Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
  return lowIsHuman ? 1 - n : n;
}
