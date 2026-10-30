import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { GLYPH_ATTRS, GLYPH_SCALES, allLooks, diffCount, lookKey, pick, shuffled, type Glyph, type GlyphLook } from "../shared/glyph";
import { TILE_GAME_VARIANTS } from "./variants";
import type { TileGameChallenge } from "./types";

const ALL = GLYPH_ATTRS;

/** Takes looks from `candidates` in order, skipping any look already used. */
function takeDistinct(candidates: readonly GlyphLook[], used: Set<string>, count: number): GlyphLook[] {
  const out: GlyphLook[] = [];
  for (const c of candidates) {
    if (out.length === count) break;
    const k = lookKey(c);
    if (used.has(k)) continue;
    used.add(k);
    out.push(c);
  }
  if (out.length !== count) throw new RangeError("not enough distinct tiles for this difficulty");
  return out;
}

/**
 * Same seed + variant + difficulty, same board. Every tile has a different look, except the one identical pair of
 * Pair Match; the answer set is the only set that satisfies the rule.
 */
export function generateTileGameChallenge({ rng, variantId, difficulty }: GenerateContext): TileGameChallenge {
  const { variant, config, challengeConfig } = resolveVariant(TILE_GAME_VARIANTS, { variantId, difficulty });
  assertRange("tile game tiles", config.tiles, 4, 8);
  assertRange("tile game required", config.required, 2, 3);
  const looks = allLooks();
  const id = (): string => `tile-game-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  const glyphs = (list: { look: GlyphLook; answer: boolean }[]): { tiles: Glyph[]; answerIds: string[] } => {
    const order = shuffled(list, rng);
    const tiles = order.map(({ look }, i) => ({ id: `t${i + 1}`, ...look, scale: pick(GLYPH_SCALES, rng) }));
    return { tiles, answerIds: tiles.filter((_, i) => order[i]?.answer).map((t) => t.id) };
  };

  if (variant.id === "pair") {
    const target = pick(looks, rng);
    const [minDiff, maxDiff] = config.similarity === "far" ? [2, 3] : config.similarity === "mixed" ? [1, 3] : [1, 1];
    const others = looks.filter((l) => {
      const d = diffCount(l, target, ALL);
      return d >= minDiff && d <= maxDiff;
    });
    const picked = takeDistinct(shuffled(others, rng), new Set([lookKey(target)]), config.tiles - 2);
    const { tiles, answerIds } = glyphs([{ look: target, answer: true }, { look: target, answer: true }, ...picked.map((look) => ({ look, answer: false }))]);
    return { id: id(), kind: "pair", tiles, required: 2, answerIds, config: challengeConfig };
  }

  const ruleAttr = pick(ALL, rng);
  const ref = pick(looks, rng);
  const sameRule = shuffled(looks.filter((l) => l[ruleAttr] === ref[ruleAttr]), rng);
  const otherRule = looks.filter((l) => l[ruleAttr] !== ref[ruleAttr]);
  // "near": the wrong tiles still agree with the reference on at least one attribute the rule does not name.
  const nearOnly = config.similarity === "near" ? otherRule.filter((l) => ALL.some((a) => a !== ruleAttr && l[a] === ref[a])) : otherRule;
  const used = new Set<string>();
  const right = takeDistinct(sameRule, used, config.required);
  const wrong = takeDistinct(shuffled(nearOnly, rng), used, config.tiles - config.required);
  const { tiles, answerIds } = glyphs([...right.map((look) => ({ look, answer: true })), ...wrong.map((look) => ({ look, answer: false }))]);
  const reference: Glyph = { id: "ref", ...ref, scale: 1 };
  return { id: id(), kind: "pattern", tiles, reference, ruleAttr, required: config.required, answerIds, config: challengeConfig };
}
