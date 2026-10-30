import type { VerificationResult } from "@captchalab/captcha-core";
import { MAX_WORKLOAD, MIN_WORKLOAD, computeLocal } from "./capability";
import { BC_CHECK_IDS, type BcAnswer, type BcChallenge } from "./types";

function challengeOk(c: unknown): c is BcChallenge {
  if (typeof c !== "object" || c === null) return false;
  const x = c as Record<string, unknown>;
  if (typeof x.seed !== "number" || !Number.isInteger(x.seed) || x.seed < 0 || x.seed > 0xffffffff) return false;
  // The bound keeps a malformed challenge from driving a long recomputation.
  if (typeof x.workload !== "number" || !Number.isInteger(x.workload) || x.workload < MIN_WORKLOAD || x.workload > MAX_WORKLOAD) return false;
  return Array.isArray(x.checks) && x.checks.length > 0 && x.checks.every((id) => (BC_CHECK_IDS as readonly unknown[]).includes(id));
}

/**
 * Passes when every asked API is reported available and the local computation matches the one recomputed here (the
 * page's own claim about "compute" is never trusted). The interaction is never consulted. Nothing throws.
 */
export function verifyBcAnswer(challenge: BcChallenge, answer: BcAnswer): VerificationResult {
  if (!challengeOk(challenge)) return { passed: false, reason: "The challenge is missing or malformed." };
  const checks = (answer as { checks?: unknown } | null | undefined)?.checks;
  if (typeof checks !== "object" || checks === null) return { passed: false, reason: "The answer must report a yes or no for each check." };
  const reported = checks as Record<string, unknown>;
  const apis = challenge.checks.filter((id) => id !== "compute");
  if (!apis.every((id) => typeof reported[id] === "boolean")) return { passed: false, reason: "The answer must report a yes or no for each check." };
  const computeAsked = challenge.checks.includes("compute");
  const computeOk = !computeAsked || answer.computed === computeLocal(challenge.seed, challenge.workload);
  const missing = challenge.checks.filter((id) => (id === "compute" ? !computeOk : reported[id] !== true));
  const passed = missing.length === 0;
  return {
    passed,
    reason: passed ? "Every asked capability is available and the computation matches." : `Not available or not matching: ${missing.join(", ")}.`,
    measurements: { checks: challenge.checks.length, supported: challenge.checks.length - missing.length, missing: missing.length },
  };
}
