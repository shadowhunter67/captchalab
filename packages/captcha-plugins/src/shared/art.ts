/**
 * The asset catalog of CaptchaLab's own illustrations (v1.1 realism pass).
 *
 * Every picture is DRAWN BY CODE from a category and a seed (apps/web/lib/art): original vector illustrations, nothing is
 * downloaded, nothing is copied from any provider or image set, and nothing is fetched at runtime. This file is the pure
 * data side: which categories exist, how they group (for look-alike distractors) and where they live. A challenge stores
 * only a category and a seed, so the same seed always gives the same pictures.
 */
export const ART_CATEGORIES = [
  "bicycle",
  "bus",
  "car",
  "boat",
  "airplane",
  "cat",
  "dog",
  "bird",
  "tree",
  "flower",
  "traffic-light",
  "house",
  "umbrella",
  "chair",
] as const;
export type ArtCategory = (typeof ART_CATEGORIES)[number];

/** Where an object normally is, so a scene around it makes sense (an airplane in the sky, a boat on water). */
export type ArtHabitat = "ground" | "sky" | "water";
export const ART_HABITAT: Readonly<Record<ArtCategory, ArtHabitat>> = {
  bicycle: "ground",
  bus: "ground",
  car: "ground",
  boat: "water",
  airplane: "sky",
  cat: "ground",
  dog: "ground",
  bird: "ground",
  tree: "ground",
  flower: "ground",
  "traffic-light": "ground",
  house: "ground",
  umbrella: "ground",
  chair: "ground",
};

/** Scenes where an object looks natural (a flower is not on a road, a bus is not in a yard). Used for the picture behind it. */
export const ART_SCENES_FOR: Readonly<Record<ArtCategory, readonly ArtScene[]>> = {
  bicycle: ["street", "park"],
  bus: ["street"],
  car: ["street", "park"],
  boat: ["water"],
  airplane: ["sky"],
  cat: ["yard", "park"],
  dog: ["yard", "park"],
  bird: ["yard", "park"],
  tree: ["park", "yard"],
  flower: ["park", "yard"],
  "traffic-light": ["street"],
  house: ["park", "yard", "street"],
  umbrella: ["park", "street"],
  chair: ["yard", "park"],
};

/** Look-alike groups: the hard level takes its distractors from the target's own group first. */
export const ART_GROUPS: Readonly<Record<string, readonly ArtCategory[]>> = {
  vehicles: ["bicycle", "bus", "car", "boat", "airplane"],
  animals: ["cat", "dog", "bird"],
  plants: ["tree", "flower"],
  street: ["traffic-light", "house"],
  things: ["umbrella", "chair"],
};

export function artGroupOf(category: ArtCategory): readonly ArtCategory[] {
  for (const members of Object.values(ART_GROUPS)) if (members.includes(category)) return members;
  return [category];
}

export const isArtCategory = (v: unknown): v is ArtCategory => typeof v === "string" && (ART_CATEGORIES as readonly string[]).includes(v);

/** Categories whose silhouette has a clear top and bottom, so "upright" is unambiguous (Rotation). */
export const ART_UPRIGHT: readonly ArtCategory[] = ["tree", "flower", "traffic-light", "house", "umbrella", "chair", "cat", "bird"];

export const SCENES = ["park", "street", "water", "sky", "yard"] as const;
export type ArtScene = (typeof SCENES)[number];

/** The catalog entry of a category: stable id, tags and an English name used only where naming it is the point (prompts). */
export interface ChallengeAsset {
  id: string;
  category: ArtCategory;
  tags: readonly string[];
  /** Plain name for prompts and Learn. Never used as the accessible name of a tile that is part of a challenge. */
  alt: string;
}

const NAMES: Readonly<Record<ArtCategory, string>> = {
  bicycle: "bicycle",
  bus: "bus",
  car: "car",
  boat: "boat",
  airplane: "airplane",
  cat: "cat",
  dog: "dog",
  bird: "bird",
  tree: "tree",
  flower: "flower",
  "traffic-light": "traffic light",
  house: "house",
  umbrella: "umbrella",
  chair: "chair",
};

export const ART_CATALOG: readonly ChallengeAsset[] = ART_CATEGORIES.map((category) => ({
  id: `art:${category}`,
  category,
  tags: [ART_HABITAT[category], ...Object.entries(ART_GROUPS).filter(([, m]) => m.includes(category)).map(([g]) => g)],
  alt: NAMES[category],
}));

export const artName = (category: ArtCategory): string => NAMES[category];
