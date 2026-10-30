import type { VerificationResult } from "@captchalab/captcha-core";
import { GLYPH_ATTRS, isGlyphLook, isScale, sameOn, type GlyphAttr } from "../shared/glyph";
import type { MatchKeyAnswer, MatchKeyChallenge } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9-]{1,16}$/;

/** Well-formed AND unambiguous: exactly one option agrees with the key on the key attributes, and it is `correctId`. */
function challengeIsValid(c: unknown): c is MatchKeyChallenge {
  if (!isRecord(c) || typeof c.id !== "string" || !isRecord(c.reference) || !Array.isArray(c.options) || !Array.isArray(c.keyAttrs)) return false;
  if (!isGlyphLook(c.reference) || typeof c.correctId !== "string") return false;
  if (c.keyAttrs.length < 1 || !c.keyAttrs.every((a) => (GLYPH_ATTRS as readonly unknown[]).includes(a))) return false;
  if (c.options.length < 2 || c.options.length > 8) return false;
  const ids = new Set<string>();
  for (const o of c.options) {
    if (!isRecord(o) || typeof o.id !== "string" || !ID.test(o.id) || ids.has(o.id) || !isGlyphLook(o) || !isScale(o.scale)) return false;
    ids.add(o.id);
  }
  const keyAttrs = c.keyAttrs as GlyphAttr[];
  const matching = c.options.filter((o) => sameOn(o as never, c.reference as never, keyAttrs)) as { id: string }[];
  return matching.length === 1 && matching[0]?.id === c.correctId;
}

/** Challenge correctness only: the selected option is the one that matches the key. Nothing here throws. */
export function verifyMatchKeyAnswer(challenge: MatchKeyChallenge, answer: MatchKeyAnswer): VerificationResult {
  if (!challengeIsValid(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const selected: unknown = (answer as { selectedId?: unknown } | null | undefined)?.selectedId;
  if (selected === undefined || selected === null) return { passed: false, reason: "No option is selected." };
  if (typeof selected !== "string" || !challenge.options.some((o) => o.id === selected)) return { passed: false, reason: "The answer names an option that is not on this board." };
  const passed = selected === challenge.correctId;
  return { passed, reason: passed ? "The selected option matches the key." : "The selected option does not match the key.", measurements: { options: challenge.options.length } };
}
