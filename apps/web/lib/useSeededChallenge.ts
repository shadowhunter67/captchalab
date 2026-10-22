import { useEffect, useMemo, useState } from "react";
import { parseSeed, randomSeed } from "./seed";

export interface SeededChallenge<T> {
  /** null until generated on the client (and when generation failed). */
  challenge: T | null;
  failed: boolean;
  /** Increments on every new challenge; use it (with the challenge id) as the session React key. */
  round: number;
  newChallenge: () => void;
}

/**
 * Challenge lifecycle shared by every playground page: a seed from `?seed=` (deterministic, used by
 * E2E tests) or random, challenge generated on the client only (no hydration mismatch), "New challenge"
 * = a new random seed. `generate` must be a stable function (module-level), it is a dependency.
 */
export function useSeededChallenge<T>(generate: (seed: number) => T): SeededChallenge<T> {
  const [seed, setSeed] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    setSeed(parseSeed(window.location.search) ?? randomSeed());
  }, []);

  const generated = useMemo<{ challenge: T | null; failed: boolean }>(() => {
    if (seed === null) return { challenge: null, failed: false };
    try {
      return { challenge: generate(seed), failed: false };
    } catch (err) {
      console.error("Challenge generation failed", err instanceof Error ? err.message : "unknown error");
      return { challenge: null, failed: true };
    }
  }, [seed, generate]);

  return {
    ...generated,
    round,
    newChallenge: () => {
      setSeed(randomSeed());
      setRound((r) => r + 1);
    },
  };
}
