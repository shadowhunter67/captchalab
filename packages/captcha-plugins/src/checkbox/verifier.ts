import type { VerificationResult } from "@captchalab/captcha-core";
import type { CheckboxAnswer, CheckboxChallenge } from "./types";

/**
 * Challenge correctness only: the final checked state must equal the expected one.
 * The interaction session and behavioral features are deliberately NOT consulted. Both arguments
 * cross a trust boundary, so their shape is validated at runtime (nothing throws).
 */
export function verifyCheckboxAnswer(challenge: CheckboxChallenge, answer: CheckboxAnswer): VerificationResult {
  if (typeof challenge !== "object" || challenge === null || typeof challenge.expectedChecked !== "boolean") {
    return { passed: false, reason: "The challenge is missing or malformed." };
  }
  const checked: unknown = (answer as { checked?: unknown } | null | undefined)?.checked;
  if (typeof checked !== "boolean") {
    return { passed: false, reason: "The answer must state whether the box is checked." };
  }
  const passed = checked === challenge.expectedChecked;
  return {
    passed,
    reason: passed ? "The checkbox was left checked, as the challenge requires." : "The checkbox was left unchecked.",
  };
}
