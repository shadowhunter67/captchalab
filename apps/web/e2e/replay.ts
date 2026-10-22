import type { Locator } from "@playwright/test";

/**
 * Sets the replay scrubber. Browsers normalise range values to ~15 significant digits and Playwright
 * rejects a value that changes when set ("Malformed value"), so: clamp to the control's bounds (rounded
 * inward to 3 decimals) and pass the text the browser reports back (no trailing zeros).
 */
export async function scrubTo(range: Locator, time: number): Promise<void> {
  const min = Math.ceil(Number(await range.getAttribute("min")) * 1000) / 1000;
  const max = Math.floor(Number(await range.getAttribute("max")) * 1000) / 1000;
  await range.fill(String(Number(Math.min(max, Math.max(min, time)).toFixed(3))));
}

/** Moves the scrubber exactly to its start or end (keyboard Home/End hit the true bounds, unlike fill). */
export async function scrubToEdge(range: Locator, edge: "start" | "end"): Promise<void> {
  await range.press(edge === "start" ? "Home" : "End");
}
