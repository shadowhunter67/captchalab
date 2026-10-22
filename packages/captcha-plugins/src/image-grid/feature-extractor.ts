import {
  composeVersion,
  createFeatureSet,
  extractBaseFeatures,
  extractGestures,
  isKeyEvent,
  type FeatureSet,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  IMAGE_GRID_ATTEMPT_PAUSE_MS,
  IMAGE_GRID_EXTRACTOR,
  IMAGE_GRID_FEATURES_SCHEMA,
  parseCellTarget,
  type ImageGridChallenge,
  type ImageGridFeatures,
} from "./types";

export interface Toggle {
  t: number;
  cellId: string;
  input: "pointer" | "keyboard";
  /** True when this toggle selected the cell (its odd-numbered toggle). */
  selected: boolean;
  /** Position in session.events of the event that completed the toggle (tie-break). */
  index: number;
}

const ACTIVATION_KEYS = new Set(["Space", "Enter"]);

/** Every completed toggle in event order: pointer press+release on one cell, or Space/Enter keydown on it. */
export function extractToggles(session: InteractionSession): Toggle[] {
  const raw: Omit<Toggle, "selected">[] = [];
  for (const g of extractGestures(session)) {
    const id = parseCellTarget(g.target);
    const last = g.events[g.events.length - 1];
    if (id === null || g.endedBy !== "up" || !last || parseCellTarget(last.target) !== id) continue;
    raw.push({ t: g.endT, cellId: id, input: "pointer", index: g.endIndex });
  }
  session.events.forEach((e, index) => {
    if (!isKeyEvent(e) || e.type !== "keydown" || !ACTIVATION_KEYS.has(e.code)) return;
    const id = parseCellTarget(e.target);
    if (id !== null) raw.push({ t: e.t, cellId: id, input: "keyboard", index });
  });
  raw.sort((a, b) => a.t - b.t || a.index - b.index);
  const counts = new Map<string, number>();
  return raw.map((r) => {
    const n = (counts.get(r.cellId) ?? 0) + 1;
    counts.set(r.cellId, n);
    return { ...r, selected: n % 2 === 1 };
  });
}

/** See the definitions in ./types.ts. */
export function extractImageGridFeatures(challenge: ImageGridChallenge, session: InteractionSession): FeatureSet<ImageGridFeatures> {
  // Events aimed at cells that are not in this grid (stale or foreign) are not part of this interaction.
  const known = new Set(challenge.cells.map((c) => c.id));
  const toggles = extractToggles(session).filter((t) => known.has(t.cellId));
  const firstPress = session.events.find(
    (e) =>
      known.has(parseCellTarget(e.target) ?? "") &&
      (("pointerId" in e && e.type === "pointerdown") || (isKeyEvent(e) && e.type === "keydown" && ACTIVATION_KEYS.has(e.code))),
  );
  const selectedNow = new Set<string>();
  for (const t of toggles) {
    if (t.selected) selectedNow.add(t.cellId);
    else selectedNow.delete(t.cellId);
  }

  let gaps = 0;
  let rounds = 0;
  let prev = Number.NEGATIVE_INFINITY;
  toggles.forEach((t, i) => {
    if (i > 0) gaps += t.t - (toggles[i - 1] as Toggle).t;
    if (t.t - prev > IMAGE_GRID_ATTEMPT_PAUSE_MS) rounds++;
    prev = t.t;
  });

  return createFeatureSet(composeVersion(IMAGE_GRID_FEATURES_SCHEMA), composeVersion(IMAGE_GRID_EXTRACTOR), {
    ...extractBaseFeatures(session),
    reactionTime: firstPress?.t ?? null,
    timeToFirstSelection: toggles.find((t) => t.selected)?.t ?? null,
    selectionCount: selectedNow.size,
    correctionCount: toggles.filter((t) => !t.selected).length,
    interClickTimeMean: toggles.length >= 2 ? gaps / (toggles.length - 1) : null,
    attemptCount: rounds,
    inputModality: session.inputModality,
  });
}
