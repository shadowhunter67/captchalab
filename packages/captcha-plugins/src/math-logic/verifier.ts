import type { VerificationResult } from "@captchalab/captcha-core";
import { evalExpr } from "./expr";
import type { MathAnswer, MathChallenge } from "./types";

/** An optional minus sign and 1 to 9 digits. Nothing else: "12abc", "1 2", "+5", "1e3" and "" all fail. */
export function parseStrictInteger(text: string): number | null {
  const t = text.trim();
  return /^-?\d{1,9}$/.test(t) ? Number(t) : null;
}

/** The answer a challenge really has: recomputed from its own expressions. null when the challenge is malformed. */
export function expectedFor(challenge: MathChallenge): number | null {
  if (typeof challenge !== "object" || challenge === null) return null;
  const a = evalExpr(challenge.expr);
  if (a === null) return null;
  let expected: number;
  if (challenge.kind === "arithmetic") expected = a;
  else if (challenge.kind === "comparison") {
    const b = challenge.other === undefined ? null : evalExpr(challenge.other);
    if (b === null || a === b) return null; // a tie would have no single larger value
    expected = Math.max(a, b);
  } else return null;
  return challenge.expectedAnswer === expected ? expected : null;
}

/**
 * Challenge correctness only. The typed text is parsed strictly and compared with the answer recomputed from the
 * challenge's own expression tree (no eval, no string parsing of the prompt). Behavior is never consulted; both
 * arguments cross a trust boundary and nothing throws. The reason never repeats what was typed.
 */
export function verifyMathAnswer(challenge: MathChallenge, answer: MathAnswer): VerificationResult {
  const expected = expectedFor(challenge);
  if (expected === null) return { passed: false, reason: "The challenge is missing or malformed." };
  const typed: unknown = (answer as { value?: unknown } | null | undefined)?.value;
  if (typeof typed !== "string") return { passed: false, reason: "The answer must be text." };
  const value = parseStrictInteger(typed);
  if (value === null) return { passed: false, reason: "The answer must be a whole number and nothing else." };
  const passed = value === expected;
  return { passed, reason: passed ? "The answer is correct." : "The answer is not correct." };
}
