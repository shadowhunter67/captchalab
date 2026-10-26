/** CAPTCHA-agnostic challenge-seed helpers shared by every playground page. */

/** Parses `?seed=<digits>` from a query string (e.g. `window.location.search`); null if absent/invalid. */
export function parseSeed(search: string): number | null {
  const raw = new URLSearchParams(search).get("seed");
  return raw !== null && /^\d{1,10}$/.test(raw) && Number(raw) <= 0xffffffff ? Number(raw) : null;
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now() >>> 0;
}
