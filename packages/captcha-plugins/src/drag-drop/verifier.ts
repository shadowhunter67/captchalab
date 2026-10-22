import type { VerificationResult } from "@captchalab/captcha-core";
import type { DragDropAnswer, DragDropChallenge } from "./types";

import { ID_PATTERN } from "./types";

/** A plain data object: prototype is Object.prototype or null (no class instances, no inherited keys). */
const isRecord = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
};
const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

/** True when the challenge is well formed: unique ids, every item has exactly one accepting target. */
function challengeProblem(challenge: unknown): string | null {
  if (!isRecord(challenge) || !Array.isArray(challenge.items) || !Array.isArray(challenge.targets)) {
    return "The challenge is missing or malformed.";
  }
  const itemIds = new Set<string>();
  for (const item of challenge.items as unknown[]) {
    if (!isRecord(item) || !isId(item.id) || itemIds.has(item.id)) return "The challenge is malformed (items).";
    itemIds.add(item.id);
  }
  const targetIds = new Set<string>();
  const accepted = new Set<string>();
  for (const t of challenge.targets as unknown[]) {
    if (!isRecord(t) || !isId(t.id) || !isId(t.acceptsItemId)) return "The challenge is malformed (targets).";
    if (targetIds.has(t.id) || !itemIds.has(t.acceptsItemId) || accepted.has(t.acceptsItemId)) {
      return "The challenge is malformed (target mapping).";
    }
    targetIds.add(t.id);
    accepted.add(t.acceptsItemId);
  }
  if (itemIds.size === 0 || accepted.size !== itemIds.size) return "The challenge is malformed (every item needs one target).";
  return null;
}

/**
 * Placement correctness only: every item must rest on the target that accepts it. The interaction session
 * and behavioral features are deliberately NOT consulted. Both arguments cross a trust boundary, so their
 * shape is validated (missing items, unknown ids, two items on one target) and nothing throws.
 */
export function verifyDragDropAnswer(challenge: DragDropChallenge, answer: DragDropAnswer): VerificationResult {
  try {
    return verifyUnchecked(challenge, answer);
  } catch {
    // Hostile input (throwing getters, proxies): fail closed instead of throwing across the boundary.
    return { passed: false, reason: "The challenge or answer could not be read." };
  }
}

function verifyUnchecked(challenge: DragDropChallenge, answer: DragDropAnswer): VerificationResult {
  const problem = challengeProblem(challenge);
  if (problem) return { passed: false, reason: problem };
  const placements: unknown = (answer as { placements?: unknown } | null | undefined)?.placements;
  if (!isRecord(placements)) return { passed: false, reason: "The answer must state where each item was placed." };

  const targetIds = new Set(challenge.targets.map((t) => t.id));
  const itemIds = new Set(challenge.items.map((i) => i.id));
  for (const key of Object.keys(placements)) {
    if (!itemIds.has(key)) return { passed: false, reason: "The answer mentions an item that is not in this challenge." };
  }
  const used = new Set<string>();
  for (const item of challenge.items) {
    if (!Object.hasOwn(placements, item.id)) return { passed: false, reason: "The answer is missing an item." };
    const value = placements[item.id];
    if (value === null) continue;
    if (typeof value !== "string" || !targetIds.has(value)) return { passed: false, reason: "The answer uses an unknown drop target." };
    if (used.has(value)) return { passed: false, reason: "Two items cannot rest on the same drop target." };
    used.add(value);
  }

  const total = challenge.items.length;
  let placed = 0;
  let correct = 0;
  for (const item of challenge.items) {
    const value = placements[item.id];
    if (value !== null) placed++;
    const target = challenge.targets.find((t) => t.acceptsItemId === item.id);
    if (target && value === target.id) correct++;
  }
  const passed = correct === total;
  return {
    passed,
    reason: passed
      ? "Every item is on its matching target."
      : placed < total
        ? "Some items are not on a target yet."
        : "Some items are on the wrong target.",
    measurements: { total, placed, correct },
  };
}
