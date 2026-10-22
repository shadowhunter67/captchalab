import type { VerificationResult } from "@captchalab/captcha-core";
import type { SliderAnswer, SliderChallenge } from "./types";

/**
 * Challenge correctness only: |position - target| <= tolerance (inclusive), normalized units.
 * Behavioral features and the interaction session are deliberately NOT consulted.
 * The answer crosses a trust boundary, so shape is validated at runtime. Exact-boundary
 * results are subject to ordinary floating-point rounding of the inputs.
 */
export function verifySliderAnswer(
  challenge: SliderChallenge,
  answer: SliderAnswer,
): VerificationResult {
  const { target, tolerance } = challenge;
  if (
    !Number.isFinite(target) || target < 0 || target > 1 ||
    !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1
  ) {
    return { passed: false, reason: "The challenge is malformed (target and tolerance must be finite numbers in [0, 1])." };
  }
  const position: unknown = (answer as { position?: unknown } | null | undefined)?.position;
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 1) {
    return { passed: false, reason: "Answer position must be a finite number between 0 and 1." };
  }
  const error = Math.abs(position - challenge.target);
  const passed = error <= challenge.tolerance;
  return {
    passed,
    reason: passed
      ? "The handle was released within the accepted tolerance of the target."
      : "The handle was released outside the accepted tolerance of the target.",
    measurements: { error, tolerance: challenge.tolerance },
  };
}
