import type { VerificationResult } from "@captchalab/captcha-core";
import { GRID_SHAPES } from "../image-grid/types";
import type { ShapeMatchingAnswer, ShapeMatchingChallenge } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9-]{1,16}$/;

function challengeIsValid(c: unknown): c is ShapeMatchingChallenge {
  if (!isRecord(c) || typeof c.id !== "string" || !Array.isArray(c.sources) || !Array.isArray(c.targets) || !isRecord(c.matches)) return false;
  if (c.sources.length < 1 || c.sources.length > 8 || c.targets.length !== c.sources.length) return false;
  const ids = (list: unknown[]): Set<string> | null => {
    const out = new Set<string>();
    for (const item of list) {
      if (!isRecord(item) || typeof item.id !== "string" || !ID.test(item.id) || out.has(item.id)) return null;
      if (typeof item.shape !== "string" || !(GRID_SHAPES as readonly string[]).includes(item.shape)) return null;
      out.add(item.id);
    }
    return out;
  };
  const sources = ids(c.sources);
  const targets = ids(c.targets);
  if (!sources || !targets) return false;
  const used = new Set<string>();
  for (const s of sources) {
    const t = c.matches[s];
    if (typeof t !== "string" || !targets.has(t) || used.has(t)) return false;
    used.add(t);
  }
  return true;
}

/**
 * Challenge correctness only: every source must be matched to its own target. The interaction and the behavioral
 * features are never consulted. Both arguments cross a trust boundary; nothing throws.
 */
export function verifyShapeMatchingAnswer(challenge: ShapeMatchingChallenge, answer: ShapeMatchingAnswer): VerificationResult {
  if (!challengeIsValid(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const given: unknown = (answer as { matches?: unknown } | null | undefined)?.matches;
  if (!isRecord(given)) return { passed: false, reason: "The answer must map each shape to a target." };
  const sourceIds = challenge.sources.map((s) => s.id);
  const targetIds = new Set(challenge.targets.map((t) => t.id));
  for (const [k, v] of Object.entries(given)) {
    if (!sourceIds.includes(k) || (v !== null && (typeof v !== "string" || !targetIds.has(v)))) {
      return { passed: false, reason: "The answer mentions a shape or target that is not on this board." };
    }
  }
  let correct = 0;
  let unmatched = 0;
  for (const s of sourceIds) {
    const t = given[s] ?? null;
    if (t === null) unmatched++;
    else if (t === challenge.matches[s]) correct++;
  }
  const wrong = sourceIds.length - correct - unmatched;
  const passed = correct === sourceIds.length;
  return {
    passed,
    reason: passed
      ? "Every shape is matched to its own target."
      : unmatched > 0 && wrong === 0
        ? "Some shapes are not matched yet."
        : wrong > 0 && unmatched === 0
          ? "Some shapes are matched to the wrong target."
          : "Some shapes are not matched and some are matched to the wrong target.",
    measurements: { pairs: sourceIds.length, correct, wrong, unmatched },
  };
}
