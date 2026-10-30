import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { GLYPH_ATTRS, GLYPH_SCALES, allLooks, diffCount, pick, sameOn, shuffled, valuesOf, type Glyph, type GlyphAttr, type GlyphLook } from "../shared/glyph";
import type { MatchKeyChallenge } from "./types";
import { MATCH_KEY_VARIANTS } from "./variants";

/**
 * Same seed + variant + difficulty, same board. The wrong options have pairwise different key signatures and none
 * agrees with the key on every key attribute, so exactly one option is correct. In Attribute Match the correct option
 * is made to differ from the key in the free attribute, so it cannot be found by looking for an identical twin.
 */
export function generateMatchKeyChallenge({ rng, variantId, difficulty }: GenerateContext): MatchKeyChallenge {
  const { config, challengeConfig } = resolveVariant(MATCH_KEY_VARIANTS, { variantId, difficulty });
  assertRange("match key options", config.options, 3, 6);
  assertRange("match key key attributes", config.keyAttributes, 2, 3);
  const keyAttrs: GlyphAttr[] = config.keyAttributes === 3 ? [...GLYPH_ATTRS] : shuffled(GLYPH_ATTRS, rng).slice(0, 2);
  keyAttrs.sort((a, b) => GLYPH_ATTRS.indexOf(a) - GLYPH_ATTRS.indexOf(b));
  const free = GLYPH_ATTRS.filter((a) => !keyAttrs.includes(a));

  const looks = allLooks();
  const key = pick(looks, rng);
  const candidates = shuffled(
    looks.filter((l) => {
      const d = diffCount(l, key, keyAttrs);
      return d >= config.minDiff && d <= config.maxDiff;
    }),
    rng,
  );
  // Wrong options must have different key signatures from each other (keeps the board free of duplicates).
  const wrong: GlyphLook[] = [];
  for (const c of candidates) {
    if (wrong.length === config.options - 1) break;
    if (!wrong.some((w) => sameOn(w, c, keyAttrs))) wrong.push(c);
  }
  if (wrong.length !== config.options - 1) throw new RangeError("not enough distinct options for this difficulty");

  // The correct option shares the key attributes; a free attribute is changed on purpose.
  const correctLook: GlyphLook = { ...key };
  for (const a of free) {
    const others = valuesOf(a).filter((v) => v !== key[a]);
    (correctLook as unknown as Record<string, unknown>)[a] = pick(others, rng);
  }
  const all = shuffled([...wrong.map((l) => ({ look: l, correct: false })), { look: correctLook, correct: true }], rng);
  const options: Glyph[] = all.map(({ look }, i) => ({ id: `o${i + 1}`, ...look, scale: pick(GLYPH_SCALES, rng) }));
  const correctId = options[all.findIndex((x) => x.correct)]?.id as string;
  const reference: Glyph = { id: "key", ...key, scale: 1 };
  const id = `match-key-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, reference, options, keyAttrs, correctId, config: challengeConfig };
}
