import type { VerificationResult } from "@captchalab/captcha-core";
import { shortestAngularDistance } from "./angles";
import type { RotationAnswer, RotationChallenge } from "./types";

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Challenge correctness only: shortestAngularDistance(angle, target) <= tolerance (inclusive), so 359 and 1
 * are both 1 degree from upright. The interaction and behavioral features are never consulted. Both
 * arguments cross a trust boundary and are validated; nothing throws.
 */
export function verifyRotationAnswer(challenge: RotationChallenge, answer: RotationAnswer): VerificationResult {
  if (
    typeof challenge !== "object" || challenge === null ||
    !finite(challenge.targetAngle) || !finite(challenge.tolerance) || challenge.tolerance < 0 || challenge.tolerance > 180
  ) {
    return { passed: false, reason: "The challenge is missing or malformed." };
  }
  const angle: unknown = (answer as { angle?: unknown } | null | undefined)?.angle;
  if (!finite(angle)) return { passed: false, reason: "The answer must be a finite angle in degrees." };
  const error = shortestAngularDistance(angle, challenge.targetAngle);
  const passed = error <= challenge.tolerance;
  return {
    passed,
    reason: passed ? "The object is upright within the accepted tolerance." : "The object is not upright enough yet.",
    measurements: { error, tolerance: challenge.tolerance },
  };
}
