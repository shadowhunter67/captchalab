import type { VerificationResult } from "@captchalab/captcha-core";
import { GLYPH_ATTRS, isGlyphLook, isScale, lookKey, type GlyphAttr } from "../shared/glyph";
import { sameSet } from "./selection";
import type { TileGameAnswer, TileGameChallenge } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9-]{1,16}$/;

/** Well-formed AND unambiguous: the answer set is the only set that satisfies the rule of the variant. */
function challengeIsValid(c: unknown): c is TileGameChallenge {
  if (!isRecord(c) || typeof c.id !== "string" || !Array.isArray(c.tiles) || !Array.isArray(c.answerIds)) return false;
  if ((c.kind !== "pair" && c.kind !== "pattern") || typeof c.required !== "number" || !Number.isInteger(c.required) || c.required < 2) return false;
  if (c.tiles.length < c.required || c.tiles.length > 12) return false;
  const ids = new Set<string>();
  for (const t of c.tiles) {
    if (!isRecord(t) || typeof t.id !== "string" || !ID.test(t.id) || ids.has(t.id) || !isGlyphLook(t) || !isScale(t.scale)) return false;
    ids.add(t.id);
  }
  if (c.answerIds.length !== c.required || !c.answerIds.every((a) => typeof a === "string" && ids.has(a)) || new Set(c.answerIds).size !== c.required) return false;
  const tiles = c.tiles as { id: string; shape: string; pattern: string; orientation: number }[];
  if (c.kind === "pair") {
    if (c.required !== 2) return false;
    const counts = new Map<string, string[]>();
    for (const t of tiles) counts.set(lookKey(t as never), [...(counts.get(lookKey(t as never)) ?? []), t.id]);
    const dupes = [...counts.values()].filter((g) => g.length > 1);
    return dupes.length === 1 && dupes[0]?.length === 2 && sameSet(dupes[0], c.answerIds as string[]);
  }
  if (!isRecord(c.reference) || !isGlyphLook(c.reference) || !(GLYPH_ATTRS as readonly unknown[]).includes(c.ruleAttr)) return false;
  const attr = c.ruleAttr as GlyphAttr;
  const ref = c.reference as unknown as Record<string, unknown>;
  const matching = tiles.filter((t) => (t as unknown as Record<string, unknown>)[attr] === ref[attr]).map((t) => t.id);
  return sameSet(matching, c.answerIds as string[]);
}

/** Challenge correctness only: the selected set equals the answer set. Nothing here throws. */
export function verifyTileGameAnswer(challenge: TileGameChallenge, answer: TileGameAnswer): VerificationResult {
  if (!challengeIsValid(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const given: unknown = (answer as { selectedIds?: unknown } | null | undefined)?.selectedIds;
  if (!Array.isArray(given)) return { passed: false, reason: "The answer must list the selected tiles." };
  const known = new Set(challenge.tiles.map((t) => t.id));
  if (!given.every((g) => typeof g === "string" && known.has(g))) return { passed: false, reason: "The answer names a tile that is not on this board." };
  if (new Set(given).size !== given.length) return { passed: false, reason: "A tile is listed twice." };
  const correct = (given as string[]).filter((g) => challenge.answerIds.includes(g)).length;
  const passed = sameSet(given as string[], challenge.answerIds);
  return {
    passed,
    reason: passed ? "The selected tiles are the answer." : given.length < challenge.required ? "Not enough tiles are selected." : "The selected tiles are not the answer.",
    measurements: { required: challenge.required, selected: given.length, correct },
  };
}
