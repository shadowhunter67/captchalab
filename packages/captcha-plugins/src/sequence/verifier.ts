import type { VerificationResult } from "@captchalab/captcha-core";
import { GRID_SHAPES } from "../image-grid/types";
import { isUnambiguous, isVisualUnambiguous } from "./rules";
import type { SequenceAnswer, SequenceChallenge } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9-]{1,16}$/;
const malformed: VerificationResult = { passed: false, reason: "The challenge is missing or malformed." };

function numberChallengeOk(c: Record<string, unknown>): boolean {
  const terms = c.terms;
  const h = c.hiddenIndex;
  if (!Array.isArray(terms) || terms.length < 4 || terms.length > 10 || typeof h !== "number" || !Number.isInteger(h)) return false;
  if (h < 2 || h >= terms.length || terms[h] !== null) return false;
  if (!terms.every((t, k) => (k === h ? t === null : Number.isSafeInteger(t)))) return false;
  const rules = ["arithmetic", "geometric", "alternating", "interleaved"];
  if (!Number.isSafeInteger(c.expectedAnswer) || typeof c.rule !== "string" || !rules.includes(c.rule)) return false;
  return isUnambiguous(terms as (number | null)[], h, c.rule as "arithmetic", c.expectedAnswer as number); // the declared answer must follow the pattern
}

function visualChallengeOk(c: Record<string, unknown>): boolean {
  const cells = c.cells;
  const options = c.options;
  const h = c.hiddenIndex;
  if (!Array.isArray(cells) || !Array.isArray(options) || typeof h !== "number" || !Number.isInteger(h)) return false;
  if (cells.length < 4 || cells.length > 10 || h < 1 || h >= cells.length || cells[h] !== null) return false;
  const known = (s: unknown): boolean => typeof s === "string" && (GRID_SHAPES as readonly string[]).includes(s);
  if (!cells.every((s, k) => (k === h ? s === null : known(s)))) return false;
  const ids = new Set<string>();
  const shapes = new Set<string>();
  for (const o of options) {
    if (!isRecord(o) || typeof o.id !== "string" || !ID.test(o.id) || ids.has(o.id) || !known(o.shape)) return false;
    ids.add(o.id);
    shapes.add(o.shape as string);
  }
  if (options.length < 2 || shapes.size !== options.length || typeof c.expectedOptionId !== "string" || !ids.has(c.expectedOptionId)) return false;
  const expected = (options.find((o) => isRecord(o) && o.id === c.expectedOptionId) as Record<string, unknown>).shape as string;
  const period = typeof c.pattern === "string" ? c.pattern.length : 0;
  return period >= 2 && isVisualUnambiguous(cells as (string | null)[], h, period, expected);
}

/**
 * Challenge correctness only: the exact hidden number, or the exact missing option. The interaction and the
 * behavioral features are never consulted. Both arguments cross a trust boundary; nothing throws.
 */
export function verifySequenceAnswer(challenge: SequenceChallenge, answer: SequenceAnswer): VerificationResult {
  if (!isRecord(challenge)) return malformed;
  const given: unknown = answer;
  if (challenge.kind === "number") {
    if (!numberChallengeOk(challenge)) return malformed;
    if (!isRecord(given) || given.kind !== "number" || typeof given.value !== "number" || !Number.isSafeInteger(given.value)) {
      return { passed: false, reason: "The answer must be a whole number." };
    }
    const passed = given.value === challenge.expectedAnswer;
    return { passed, reason: passed ? "The missing number is correct." : "The missing number is not correct." };
  }
  if (challenge.kind === "visual") {
    if (!visualChallengeOk(challenge)) return malformed;
    if (!isRecord(given) || given.kind !== "option" || typeof given.optionId !== "string") return { passed: false, reason: "The answer must be one of the options." };
    if (!challenge.options.some((o) => o.id === given.optionId)) return { passed: false, reason: "The answer is not one of the options." };
    const passed = given.optionId === challenge.expectedOptionId;
    return { passed, reason: passed ? "The missing shape is correct." : "The missing shape is not correct." };
  }
  return malformed;
}
