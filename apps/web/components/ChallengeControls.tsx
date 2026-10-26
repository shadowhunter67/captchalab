"use client";

import { useEffect, useId, useState } from "react";
import { DIFFICULTIES, supportedDifficulties, type CaptchaDifficulty, type CaptchaVariantSet, type VariantParameters } from "@captchalab/captcha-core";
import { useT } from "@/lib/i18n";
import { difficultyLabel, variantDescription, variantName, type CaptchaKey } from "@/lib/variants-ui";
import type { VariantChoice } from "@/lib/useSeededChallenge";

interface Props {
  captcha: CaptchaKey;
  variantSet: CaptchaVariantSet<VariantParameters>;
  choice: VariantChoice;
  seed: number | null;
  onVariant: (variantId: string) => void;
  onDifficulty: (difficulty: CaptchaDifficulty) => void;
  onSeed: (seed: number) => void;
}

/**
 * Variant, difficulty and seed of the current challenge. Any change makes a new challenge (the playground
 * remounts its session, so nothing recorded earlier carries over). "New challenge" lives in the session panel.
 */
export function ChallengeControls({ captcha, variantSet, choice, seed, onVariant, onDifficulty, onSeed }: Props) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(seed === null ? "" : String(seed)), [seed]);

  const variant = variantSet.variants.find((v) => v.id === choice.variantId) ?? variantSet.variants[0];
  const supported = variant ? supportedDifficulties(variant) : [];
  const parsed = /^\d{1,10}$/.test(draft.trim()) ? Number(draft.trim()) : null;
  const validSeed = parsed !== null && parsed <= 0xffffffff;

  return (
    <section aria-label={t("Cấu hình thử thách", "Challenge setup")} className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="challenge-controls">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <label htmlFor={`${id}-variant`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            {t("Biến thể", "Variant")}
          </label>
          <select
            id={`${id}-variant`}
            data-testid="variant-select"
            value={choice.variantId}
            onChange={(e) => onVariant(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          >
            {variantSet.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {variantName(captcha, v.id, v.name, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div id={`${id}-difficulty`} className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("Độ khó", "Difficulty")}
          </div>
          <div role="group" aria-labelledby={`${id}-difficulty`} className="flex overflow-hidden rounded-md border border-line">
            {DIFFICULTIES.map((d) => {
              const ok = supported.includes(d);
              const on = choice.difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!ok}
                  aria-pressed={on}
                  data-testid={`difficulty-${d}`}
                  onClick={() => onDifficulty(d)}
                  className={`min-w-16 px-3 py-2 text-sm font-medium ${on ? "bg-accent text-bg" : "bg-bg hover:bg-track"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {difficultyLabel(d, t)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {variant && (
        <p className="text-xs text-muted" data-testid="variant-description">
          {variantDescription(captcha, variant.id, variant.description, t)}
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (validSeed) onSeed(parsed);
        }}
      >
        <div>
          <label htmlFor={`${id}-seed`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Seed
          </label>
          <input
            id={`${id}-seed`}
            data-testid="seed-input"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-invalid={draft !== "" && !validSeed}
            className="w-40 rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          data-testid="seed-apply"
          disabled={!validSeed}
          className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-40"
        >
          {t("Dùng seed này", "Use this seed")}
        </button>
        <span className="pb-2 text-xs text-muted">{t("Cùng seed, biến thể và độ khó cho cùng một thử thách.", "The same seed, variant and difficulty give the same challenge.")}</span>
      </form>
    </section>
  );
}
