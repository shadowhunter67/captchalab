import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { ART_GROUPS, type ArtCategory } from "../shared/art";
import type { GridShape, GridSubject } from "../image-grid/types";
import type { MatchShape, ShapeMatchingChallenge } from "./types";
import { SHAPE_MATCHING_VARIANTS } from "./variants";

const POOLS: Readonly<Record<string, readonly GridShape[]>> = {
  low: ["circle", "square", "triangle", "star"],
  medium: ["circle", "square", "triangle", "star", "oval"],
};
/** "high" always contains both look-alike pairs; the rest are filled up from these. */
const HIGH_CORE: readonly GridShape[] = ["circle", "oval", "square", "rounded"];
const HIGH_EXTRA: readonly GridShape[] = ["triangle", "star"];

function shuffled<T>(values: readonly T[], rng: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function pickShapes(similarity: string, pairs: number, rng: () => number): GridSubject[] {
  if (similarity === "objects") {
    // One object from each of `pairs` different look-alike groups: a bus and a cat, never a bus and a car.
    return shuffled(Object.keys(ART_GROUPS), rng)
      .slice(0, pairs)
      .map((g) => {
        const members = ART_GROUPS[g] as readonly ArtCategory[];
        return members[Math.floor(rng() * members.length)] as ArtCategory;
      });
  }
  if (similarity === "high") {
    const extra = shuffled(HIGH_EXTRA, rng);
    return shuffled([...HIGH_CORE, ...extra].slice(0, pairs), rng);
  }
  const pool = POOLS[similarity];
  if (!pool) throw new RangeError(`Unknown similarity "${similarity}"`);
  return shuffled(pool, rng).slice(0, pairs);
}

/**
 * Same seed + variant + difficulty, same board. Source s_i and target t_j are the same shape exactly when
 * matches[s_i] = t_j, and every shape appears once on each side, so there is exactly one correct matching.
 */
export function generateShapeMatchingChallenge({ rng, variantId, difficulty }: GenerateContext): ShapeMatchingChallenge {
  const { config, challengeConfig } = resolveVariant(SHAPE_MATCHING_VARIANTS, { variantId, difficulty });
  assertRange("shape matching pairs", config.pairs, 2, 6);
  assertRange("shape matching rotation", config.rotationDeg, 0, 345);
  assertRange("shape matching size variation", config.sizeVariation, 0, 0.5);
  const shapes = pickShapes(config.similarity, config.pairs, rng);
  if (new Set(shapes).size !== shapes.length || shapes.length !== config.pairs) {
    throw new RangeError("not enough distinct shapes for this number of pairs");
  }

  const sources: MatchShape[] = shapes.map((shape, i) => ({ id: `s${i + 1}`, shape, rotation: 0, filled: true, scale: 1 }));
  const order = shuffled(shapes.map((_, i) => i), rng);
  const targets: MatchShape[] = order.map((sourceIndex, j) => {
    const rotation = config.rotationDeg > 0 ? Math.round((rng() * config.rotationDeg) / 15) * 15 : 0;
    // An object target is always drawn as a silhouette; mixedFill only applies to plain shapes.
    const filled = config.similarity === "objects" ? false : config.mixedFill ? rng() < 0.5 : true;
    const scale = config.sizeVariation > 0 ? Math.round((1 + (rng() - 0.5) * 2 * config.sizeVariation) * 100) / 100 : 1;
    return { id: `t${j + 1}`, shape: shapes[sourceIndex] as GridSubject, rotation, filled, scale };
  });
  const matches: Record<string, string> = {};
  order.forEach((sourceIndex, j) => {
    matches[`s${sourceIndex + 1}`] = `t${j + 1}`;
  });
  const id = `shape-matching-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, sources, targets, matches, config: challengeConfig };
}
