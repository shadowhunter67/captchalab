import type { VerificationResult } from "@captchalab/captcha-core";
import { expectedSelection } from "./generator";
import { GRID_SHAPES, GRID_SIZE, type ImageGridAnswer, type ImageGridChallenge } from "./types";

/** Upper bound on the submitted list (a valid selection has at most 9 ids; duplicates are tolerated). */
const MAX_SELECTED_LIST = 64;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function challengeIsValid(c: unknown): c is ImageGridChallenge {
  if (!isRecord(c) || typeof c.id !== "string" || typeof c.target !== "string" || !Array.isArray(c.cells)) return false;
  if (!(GRID_SHAPES as readonly string[]).includes(c.target) || c.cells.length !== GRID_SIZE * GRID_SIZE) return false;
  const ids = new Set<string>();
  for (const cell of c.cells as unknown[]) {
    if (!isRecord(cell) || typeof cell.id !== "string" || typeof cell.shape !== "string" || ids.has(cell.id)) return false;
    if (!/^[a-z0-9-]{1,16}$/.test(cell.id) || !(GRID_SHAPES as readonly string[]).includes(cell.shape)) return false;
    ids.add(cell.id);
  }
  return true;
}

/**
 * Challenge correctness only: the selected cell ids must equal the set of cells showing the target
 * (no missing, no extra). Selection order and duplicates in the list do not matter. The interaction and
 * behavioral features are never consulted. Both arguments cross a trust boundary; nothing throws.
 */
export function verifyImageGridAnswer(challenge: ImageGridChallenge, answer: ImageGridAnswer): VerificationResult {
  if (!challengeIsValid(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const selected: unknown = (answer as { selected?: unknown } | null | undefined)?.selected;
  if (!Array.isArray(selected) || selected.length > MAX_SELECTED_LIST || selected.some((s) => typeof s !== "string")) {
    return { passed: false, reason: "The answer must be a list of cell ids." };
  }
  const known = new Set(challenge.cells.map((c) => c.id));
  const chosen = new Set(selected as string[]);
  if ([...chosen].some((id) => !known.has(id))) return { passed: false, reason: "The answer mentions a cell that is not in this grid." };

  const expected = new Set(expectedSelection(challenge));
  const missing = [...expected].filter((id) => !chosen.has(id)).length;
  const extra = [...chosen].filter((id) => !expected.has(id)).length;
  const passed = missing === 0 && extra === 0;
  return {
    passed,
    reason: passed
      ? "Every matching image is selected and nothing else."
      : missing > 0 && extra > 0
        ? "Some matching images are missing and some selected images do not match."
        : missing > 0
          ? "Some matching images are not selected."
          : "Some selected images do not match.",
    measurements: { expected: expected.size, selected: chosen.size, missing, extra },
  };
}
