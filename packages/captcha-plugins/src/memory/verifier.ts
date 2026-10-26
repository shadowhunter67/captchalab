import type { VerificationResult } from "@captchalab/captcha-core";
import { GRID_SHAPES } from "../image-grid/types";
import type { MemoryAnswer, MemoryChallenge } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9-]{1,16}$/;
const malformed: VerificationResult = { passed: false, reason: "The challenge is missing or malformed." };
const isStringList = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every((s) => typeof s === "string");

function sequenceOk(c: Record<string, unknown>): boolean {
  const options = c.options;
  const sequence = c.sequence;
  if (!Array.isArray(options) || options.length < 2 || options.length > 8 || !isStringList(sequence, 8) || sequence.length < 2) return false;
  const ids = new Set<string>();
  const shapes = new Set<string>();
  for (const o of options) {
    if (!isRecord(o) || typeof o.id !== "string" || !ID.test(o.id) || ids.has(o.id)) return false;
    if (typeof o.shape !== "string" || !(GRID_SHAPES as readonly string[]).includes(o.shape) || shapes.has(o.shape)) return false;
    ids.add(o.id);
    shapes.add(o.shape);
  }
  return new Set(sequence).size === sequence.length && sequence.every((s) => ids.has(s));
}

function positionOk(c: Record<string, unknown>): boolean {
  const size = c.size;
  const targets = c.targets;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 2 || size > 5 || !isStringList(targets, 25) || targets.length < 1) return false;
  return new Set(targets).size === targets.length && targets.every((t) => /^c\d{1,2}$/.test(t) && Number(t.slice(1)) >= 1 && Number(t.slice(1)) <= size * size) && targets.length < size * size;
}

/**
 * Challenge correctness only. Sequence: the chosen options must equal the shown sequence, in order. Position: the
 * chosen cells must equal the highlighted cells (order does not matter). The interaction is never consulted. Both
 * arguments cross a trust boundary; nothing throws.
 */
export function verifyMemoryAnswer(challenge: MemoryChallenge, answer: MemoryAnswer): VerificationResult {
  if (!isRecord(challenge)) return malformed;
  const given: unknown = answer;
  if (challenge.kind === "sequence") {
    if (!sequenceOk(challenge)) return malformed;
    if (!isRecord(given) || given.kind !== "sequence" || !isStringList(given.selections, 8)) return { passed: false, reason: "The answer must be a list of options." };
    const chosen = given.selections;
    const ids = new Set(challenge.options.map((o) => o.id));
    if (chosen.some((s) => !ids.has(s))) return { passed: false, reason: "The answer mentions an option that is not offered." };
    const expected = challenge.sequence;
    const passed = chosen.length === expected.length && chosen.every((s, i) => s === expected[i]);
    return {
      passed,
      reason: passed
        ? "The sequence is recalled in the right order."
        : chosen.length < expected.length && chosen.every((s, i) => s === expected[i])
          ? "The sequence is not complete yet."
          : "The sequence is not in the right order.",
      measurements: { length: expected.length, chosen: chosen.length },
    };
  }
  if (challenge.kind === "position") {
    if (!positionOk(challenge)) return malformed;
    if (!isRecord(given) || given.kind !== "position" || !isStringList(given.selectedCells, 25)) return { passed: false, reason: "The answer must be a list of cells." };
    const chosen = new Set(given.selectedCells);
    const total = challenge.size * challenge.size;
    if ([...chosen].some((c) => !/^c\d{1,2}$/.test(c) || Number(c.slice(1)) < 1 || Number(c.slice(1)) > total)) {
      return { passed: false, reason: "The answer mentions a cell that is not on this grid." };
    }
    const targets = new Set(challenge.targets);
    const missing = [...targets].filter((c) => !chosen.has(c)).length;
    const extra = [...chosen].filter((c) => !targets.has(c)).length;
    const passed = missing === 0 && extra === 0;
    return {
      passed,
      reason: passed
        ? "The highlighted cells are recalled exactly."
        : missing > 0 && extra === 0
          ? "Some highlighted cells are missing."
          : extra > 0 && missing === 0
            ? "Some chosen cells were not highlighted."
            : "Some highlighted cells are missing and some chosen cells were not highlighted.",
      measurements: { targets: targets.size, missing, extra },
    };
  }
  return malformed;
}
