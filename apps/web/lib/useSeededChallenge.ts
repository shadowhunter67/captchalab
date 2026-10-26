import { useCallback, useEffect, useMemo, useState } from "react";
import { DIFFICULTIES, isDifficulty, supportedDifficulties, type CaptchaDifficulty, type CaptchaVariantSet, type ChallengeConfig, type VariantParameters } from "@captchalab/captcha-core";
import { parseSeed, randomSeed } from "./seed";

export interface VariantChoice {
  variantId: string;
  difficulty: CaptchaDifficulty;
}

export interface SeededChallenge<T> {
  /** null until generated on the client (and when generation failed). */
  challenge: T | null;
  failed: boolean;
  /** Increments on every new challenge or configuration change; use it (with the challenge id) as the session React key. */
  round: number;
  /** A new random seed with the same variant and difficulty. */
  newChallenge: () => void;
  choice: VariantChoice;
  seed: number | null;
  setVariant: (variantId: string) => void;
  setDifficulty: (difficulty: CaptchaDifficulty) => void;
  /** Use this exact seed (for reproducing a challenge). */
  setSeed: (seed: number) => void;
}

const NO_CHOICE: VariantChoice = { variantId: "", difficulty: "medium" };

/** Keeps the chosen level when the new variant supports it, else the closest supported one (medium first). */
function fitDifficulty(set: CaptchaVariantSet<VariantParameters>, variantId: string, wanted: CaptchaDifficulty): CaptchaDifficulty {
  const variant = set.variants.find((v) => v.id === variantId);
  if (!variant) return wanted;
  const ok = supportedDifficulties(variant);
  if (ok.includes(wanted)) return wanted;
  if (ok.includes("medium")) return "medium";
  return ok[0] ?? wanted;
}

function readChoice(set: CaptchaVariantSet<VariantParameters> | undefined, search: string): VariantChoice {
  if (!set) return NO_CHOICE;
  const params = new URLSearchParams(search);
  const v = params.get("variant");
  const d = params.get("difficulty");
  const variant = set.variants.find((x) => x.id === v);
  const variantId = variant ? variant.id : set.defaultSelection.variantId;
  const wanted = isDifficulty(d) ? d : variant ? "medium" : set.defaultSelection.difficulty;
  return { variantId, difficulty: fitDifficulty(set, variantId, wanted) };
}

/** Mirrors the setup in the query string (other parameters such as `lang` and `embed` are kept). */
function writeUrl(seed: number | null, choice: VariantChoice, withVariants: boolean): void {
  try {
    const url = new URL(window.location.href);
    if (seed !== null) url.searchParams.set("seed", String(seed));
    if (withVariants) {
      url.searchParams.set("variant", choice.variantId);
      url.searchParams.set("difficulty", choice.difficulty);
    }
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // The URL is a convenience only.
  }
}

/**
 * Challenge lifecycle shared by every playground page: seed, variant and difficulty from the query string
 * (`?seed=&variant=&difficulty=`, deterministic, used by E2E tests) or defaults/random; the challenge is generated on the
 * client only (no hydration mismatch). "New challenge" = a new random seed with the same variant and level.
 * `generate` must be a stable function (module-level), it is a dependency. Any change of seed, variant or
 * difficulty bumps `round`, so the session below remounts and nothing recorded carries over.
 */
export function useSeededChallenge<T>(
  generate: (seed: number, choice: VariantChoice) => T,
  variantSet?: CaptchaVariantSet<VariantParameters>,
): SeededChallenge<T> {
  const [seed, setSeedState] = useState<number | null>(null);
  const [choice, setChoice] = useState<VariantChoice>(() => (variantSet ? { ...variantSet.defaultSelection } : NO_CHOICE));
  const [round, setRound] = useState(0);

  useEffect(() => {
    setChoice(readChoice(variantSet, window.location.search));
    setSeedState(parseSeed(window.location.search) ?? randomSeed());
  }, [variantSet]);

  const generated = useMemo<{ challenge: T | null; failed: boolean }>(() => {
    if (seed === null) return { challenge: null, failed: false };
    try {
      return { challenge: generate(seed, choice), failed: false };
    } catch (err) {
      console.error("Challenge generation failed", err instanceof Error ? err.message : "unknown error");
      return { challenge: null, failed: true };
    }
  }, [seed, choice, generate]);

  const apply = useCallback(
    (nextSeed: number, nextChoice: VariantChoice) => {
      setSeedState(nextSeed);
      setChoice(nextChoice);
      setRound((r) => r + 1);
      writeUrl(nextSeed, nextChoice, variantSet !== undefined);
    },
    [variantSet],
  );

  return {
    ...generated,
    round,
    choice,
    seed,
    newChallenge: () => apply(randomSeed(), choice),
    setVariant: (variantId) => {
      if (!variantSet) return;
      apply(seed ?? randomSeed(), { variantId, difficulty: fitDifficulty(variantSet, variantId, choice.difficulty) });
    },
    setDifficulty: (difficulty) =>
      apply(seed ?? randomSeed(), { ...choice, difficulty: variantSet ? fitDifficulty(variantSet, choice.variantId, difficulty) : difficulty }),
    setSeed: (next) => apply(next >>> 0, choice),
  };
}

/** Records the seed on the challenge's config (a generator only sees the rng). */
export function stampSeed<C extends { config?: ChallengeConfig }>(challenge: C, seed: number): C {
  return challenge.config ? { ...challenge, config: { ...challenge.config, seed: String(seed) } } : challenge;
}

export { DIFFICULTIES };
