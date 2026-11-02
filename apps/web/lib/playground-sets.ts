import { VARIANT_SETS } from "@captchalab/captcha-plugins";

/**
 * The variant sets the PLAYGROUND pages open with (v1.1). A challenge page with no `variant` in its address shows the
 * realistic variant of its family first (a picture grid, a puzzle slider, an upright picture, object cards...); the plain
 * shape variants are one choice away in the Variant box, and every address that names a variant still gets exactly that
 * variant. Compare, Builder, Experiments and the dataset keep reading the plugins' own defaults, so nothing recorded or
 * exported before changes meaning.
 */
const REALISTIC: Readonly<Record<string, string>> = {
  "image-grid": "photo-categories",
  slider: "puzzle",
  rotation: "upright-object",
  "drag-drop": "object-silhouette",
  "shape-matching": "object-silhouette",
  "match-key": "exact-object",
  "tile-game": "pair-object",
};

function withRealisticDefault<K extends keyof typeof VARIANT_SETS>(id: K): (typeof VARIANT_SETS)[K] {
  const set = VARIANT_SETS[id];
  const variantId = REALISTIC[id];
  if (!variantId) return set;
  return { ...set, defaultSelection: { ...set.defaultSelection, variantId } };
}

export const PLAYGROUND_SETS: typeof VARIANT_SETS = {
  ...VARIANT_SETS,
  "image-grid": withRealisticDefault("image-grid"),
  slider: withRealisticDefault("slider"),
  rotation: withRealisticDefault("rotation"),
  "drag-drop": withRealisticDefault("drag-drop"),
  "shape-matching": withRealisticDefault("shape-matching"),
  "match-key": withRealisticDefault("match-key"),
  "tile-game": withRealisticDefault("tile-game"),
};
