"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DIFFICULTIES, isDifficulty, supportedDifficulties, type CaptchaDifficulty, type ChallengeConfig } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { ChallengeConfigCard } from "@/components/inspect/ChallengeConfigCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { HumanTask } from "@/features/compare/HumanTask";
import { BEHAVIOR_CAPTCHAS, isBehaviorCaptcha, type BehaviorCaptchaId } from "@/lib/behavior/types";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { randomSeed } from "@/lib/seed";
import { difficultyLabel, variantDescription, variantName } from "@/lib/variants-ui";
import { approxSize, describeError, downloadText, jsonText, readFileText } from "@/lib/research/browser";
import { MAX_SEED, generateChallenge, toDefinitionFile, validateDefinition, type ChallengeDefinition } from "@/lib/research/definition";
import { importText, peekFormat } from "@/lib/research/formats";
import { FormatError, safeFilename } from "@/lib/research/safe";

interface Form {
  captcha: BehaviorCaptchaId;
  variant: string;
  difficulty: CaptchaDifficulty;
  seedText: string;
  name: string;
}

const defaults = (captcha: BehaviorCaptchaId): Pick<Form, "variant" | "difficulty"> => {
  const d = VARIANT_SETS[captcha].defaultSelection;
  return { variant: d.variantId, difficulty: d.difficulty };
};

/** Keeps the level when the new variant has it, else medium, else the first one it has. */
function fitDifficulty(captcha: BehaviorCaptchaId, variantId: string, wanted: CaptchaDifficulty): CaptchaDifficulty {
  const v = VARIANT_SETS[captcha].variants.find((x) => x.id === variantId);
  if (!v) return wanted;
  const ok = supportedDifficulties(v);
  return ok.includes(wanted) ? wanted : ok.includes("medium") ? "medium" : (ok[0] ?? wanted);
}

/** The query that carries a definition to Compare and Experiments: four small, safe fields. */
export function definitionQuery(d: Pick<ChallengeDefinition, "captcha" | "variant" | "difficulty" | "seed">): string {
  return new URLSearchParams({ captcha: d.captcha, variant: d.variant, difficulty: d.difficulty, seed: String(d.seed) }).toString();
}

/** Reads a definition from a query string; null when any field is missing or invalid (nothing is repaired). */
export function definitionFromSearch(search: string): ChallengeDefinition | null {
  const p = new URLSearchParams(search);
  const captcha = p.get("captcha");
  const variant = p.get("variant");
  const difficulty = p.get("difficulty");
  const seedRaw = p.get("seed");
  if (!isBehaviorCaptcha(captcha) || !variant || !isDifficulty(difficulty) || seedRaw === null || !/^\d{1,10}$/.test(seedRaw)) return null;
  const d = { captcha, variant, difficulty, seed: Number(seedRaw) };
  return validateDefinition(d).length === 0 ? d : null;
}

export function BuilderPage() {
  const t = useT();
  const id = useId();
  const [form, setForm] = useState<Form | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [tried, setTried] = useState<boolean | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const names = useMemo(() => new Map(catalogFor(t).map((c) => [c.id, c.name])), [t]);

  // Start from the URL when it carries a valid definition, else from the Slider defaults and a fresh seed.
  useEffect(() => {
    const fromUrl = definitionFromSearch(window.location.search);
    if (fromUrl) setForm({ captcha: fromUrl.captcha, variant: fromUrl.variant, difficulty: fromUrl.difficulty, seedText: String(fromUrl.seed), name: "" });
    else setForm({ captcha: "slider", ...defaults("slider"), seedText: String(randomSeed()), name: "" });
  }, []);

  const seedValid = form !== null && /^\d{1,10}$/.test(form.seedText.trim()) && Number(form.seedText.trim()) <= MAX_SEED;
  const candidate = form && { captcha: form.captcha, variant: form.variant, difficulty: form.difficulty, seed: seedValid ? Number(form.seedText.trim()) : Number.NaN };
  const errors = candidate ? validateDefinition(candidate) : [];
  const definition: ChallengeDefinition | null = candidate && errors.length === 0 ? { ...(candidate as ChallengeDefinition), ...(form.name.trim() ? { name: form.name.trim() } : {}) } : null;

  // The four identity fields as one string: the challenge is rebuilt only when they change (not on a name edit).
  const defKey = definition ? definitionQuery(definition) : "";
  const challenge = useMemo(() => {
    const d = definitionFromSearch(defKey);
    return d ? generateChallenge(d) : null;
  }, [defKey]);
  const config = (challenge as { config?: ChallengeConfig } | null)?.config;

  // Mirror only the four small fields in the address bar, and only when valid.
  useEffect(() => {
    if (defKey === "") return;
    try {
      const url = new URL(window.location.href);
      url.search = defKey + (url.searchParams.get("lang") === "en" ? "&lang=en" : "");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // The address bar is a convenience only.
    }
  }, [defKey]);

  if (!form) return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p></main>;

  const set = (patch: Partial<Form>): void => {
    setNotice(null);
    setTried(null);
    setForm({ ...form, ...patch });
  };
  const variantSet = VARIANT_SETS[form.captcha];
  const variant = variantSet.variants.find((v) => v.id === form.variant);
  const supported = variant ? supportedDifficulties(variant) : [];

  const copySeed = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(form.seedText.trim());
      setNotice({ kind: "ok", text: t("Đã sao chép seed.", "Seed copied.") });
    } catch {
      setNotice({ kind: "error", text: t("Không sao chép được tự động. Hãy chọn và sao chép seed thủ công.", "Could not copy automatically. Select the seed and copy it by hand.") });
    }
  };

  const download = (): void => {
    if (!definition) return;
    try {
      const text = jsonText(toDefinitionFile(definition));
      const file = safeFilename("challenge", definition.captcha, definition.seed);
      downloadText(file, text);
      setNotice({ kind: "ok", text: `${file} · ${approxSize(text)}` });
    } catch (err) {
      setNotice({ kind: "error", text: describeError(err, t) });
    }
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const peeked = peekFormat(text);
      if (peeked === "interaction-session" || peeked === "experiment-bundle") {
        throw new FormatError("unsupported-format", peeked === "interaction-session" ? "this is a session file; import it in Experiments" : "this is an experiment file; import it in Experiments");
      }
      const imported = importText(text);
      if (imported.kind === "challenge") {
        const d = imported.definition;
        setForm({ captcha: d.captcha, variant: d.variant, difficulty: d.difficulty, seedText: String(d.seed), name: d.name ?? "" });
        setTried(null);
        setPreviewKey((k) => k + 1); // the same identity imported again still starts a fresh preview
        setNotice({ kind: "ok", text: t("Đã nhập định nghĩa thử thách.", "Challenge definition imported.") });
      } else {
        throw new FormatError("unsupported-format", imported.kind === "session" ? "this is a session file; import it in Experiments" : "this is an experiment file; import it in Experiments");
      }
    } catch (err) {
      setNotice({ kind: "error", text: describeError(err, t) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const query = definition ? definitionQuery(definition) : "";

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link prefetch={false} href="/behavior" className="text-sm text-muted underline">{t("Phòng thí nghiệm hành vi", "Behavioral Lab")}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Trình dựng thử thách", "Challenge builder")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Chọn CAPTCHA, biến thể, độ khó và seed để dựng một thử thách tái lập được. Cùng định nghĩa và cùng seed luôn cho đúng cùng một thử thách. Mọi thứ chạy trong thẻ trình duyệt này.",
            "Choose a CAPTCHA, variant, difficulty and seed to build a reproducible challenge. The same definition and seed always give exactly the same challenge. Everything runs in this browser tab.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />

      <section aria-labelledby={`${id}-cfg`} className="space-y-4 rounded-lg border border-line bg-panel p-4" data-testid="builder-form">
        <h2 id={`${id}-cfg`} className="text-base font-semibold">{t("1. Cấu hình", "1. Configuration")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-captcha`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">CAPTCHA</label>
            <select
              id={`${id}-captcha`}
              data-testid="builder-captcha"
              value={form.captcha}
              onChange={(e) => {
                if (isBehaviorCaptcha(e.target.value)) set({ captcha: e.target.value, ...defaults(e.target.value) });
              }}
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
            >
              {BEHAVIOR_CAPTCHAS.map((c) => (
                <option key={c} value={c}>{names.get(c) ?? c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-variant`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Biến thể", "Variant")}</label>
            <select
              id={`${id}-variant`}
              data-testid="builder-variant"
              value={form.variant}
              onChange={(e) => set({ variant: e.target.value, difficulty: fitDifficulty(form.captcha, e.target.value, form.difficulty) })}
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
            >
              {variantSet.variants.map((v) => (
                <option key={v.id} value={v.id}>{variantName(form.captcha, v.id, v.name, t)}</option>
              ))}
            </select>
          </div>
        </div>
        {variant && <p className="text-xs text-muted" data-testid="builder-variant-description">{variantDescription(form.captcha, variant.id, variant.description, t)}</p>}

        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("Độ khó", "Difficulty")}</legend>
          <div className="flex overflow-hidden rounded-md border border-line sm:w-fit">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!supported.includes(d)}
                aria-pressed={form.difficulty === d}
                data-testid={`builder-difficulty-${d}`}
                onClick={() => set({ difficulty: d })}
                className={`min-w-20 px-3 py-2 text-sm font-medium ${form.difficulty === d ? "bg-accent text-bg" : "bg-bg hover:bg-track"} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {difficultyLabel(d, t)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`${id}-seed`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Seed</label>
            <input
              id={`${id}-seed`}
              data-testid="builder-seed"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={form.seedText}
              onChange={(e) => set({ seedText: e.target.value })}
              aria-invalid={!seedValid}
              aria-describedby={`${id}-seed-help`}
              className="w-44 rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm"
            />
          </div>
          <button type="button" data-testid="builder-new-seed" onClick={() => set({ seedText: String(randomSeed()) })} className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track">
            {t("Tạo seed", "Generate seed")}
          </button>
          <button type="button" data-testid="builder-copy-seed" disabled={!seedValid} onClick={() => void copySeed()} className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-50">
            {t("Sao chép seed", "Copy seed")}
          </button>
        </div>
        <p id={`${id}-seed-help`} className="text-xs text-muted">
          {t(`Seed là số nguyên từ 0 đến ${MAX_SEED}. Seed chỉ đổi khi bạn bấm “Tạo seed” hoặc tự gõ.`, `The seed is a whole number from 0 to ${MAX_SEED}. It changes only when you press “Generate seed” or type one.`)}
        </p>

        <div>
          <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Tên (tuỳ chọn)", "Name (optional)")}</label>
          <input id={`${id}-name`} data-testid="builder-name" maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} className="w-full max-w-sm rounded-md border border-line bg-bg px-3 py-2 text-sm" />
        </div>

        {errors.length > 0 && (
          <div role="alert" data-testid="builder-errors" className="rounded-md border border-line p-3 text-sm text-bad">
            <p className="font-medium">{t("Cấu hình chưa hợp lệ, chưa dựng thử thách:", "The configuration is not valid, so no challenge is built:")}</p>
            <ul className="list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {notice && (
          <p role={notice.kind === "error" ? "alert" : "status"} data-testid="builder-notice" className={`text-sm ${notice.kind === "error" ? "text-bad" : "text-muted"}`}>
            {notice.text}
          </p>
        )}
      </section>

      {definition && challenge !== null && (
        <>
          <section aria-labelledby={`${id}-prev`} className="space-y-4" data-testid="builder-preview">
            <h2 id={`${id}-prev`} className="text-base font-semibold">{t("2. Xem trước", "2. Preview")}</h2>
            <ChallengeConfigCard captcha={definition.captcha} config={config} />
            <div className="rounded-lg border border-line bg-panel p-4">
              <p className="mb-3 text-sm text-muted">
                {t("Thử ngay thử thách này. Lần thử chỉ nằm trong bộ nhớ; hãy dùng Thí nghiệm để giữ lại các phiên.", "Try this exact challenge. The attempt stays in memory only; use Experiments to keep sessions.")}
              </p>
              <HumanTask
                key={`${previewKey}:${definition.captcha}:${definition.variant}:${definition.difficulty}:${definition.seed}`}
                captchaId={definition.captcha}
                challenge={challenge}
                onNewChallenge={() => set({ seedText: String(randomSeed()) })}
                onResult={(r) => setTried(r.passed)}
                onReset={() => setTried(null)}
              />
              {tried !== null && (
                <p role="status" className="mt-3 text-sm text-muted" data-testid="builder-tried">
                  {tried ? t("Đã ghi một lần thử (đạt).", "One attempt recorded (passed).") : t("Đã ghi một lần thử (chưa đạt).", "One attempt recorded (not passed).")}
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby={`${id}-use`} className="space-y-3 rounded-lg border border-line bg-panel p-4">
            <h2 id={`${id}-use`} className="text-base font-semibold">{t("3. Dùng định nghĩa này", "3. Use this definition")}</h2>
            <div className="flex flex-wrap gap-3">
              <Link prefetch={false} href={`/experiments?${query}`} data-testid="builder-to-experiment" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg hover:opacity-90">
                {t("Bắt đầu một thí nghiệm", "Start an experiment")}
              </Link>
              <Link prefetch={false} href={`/compare?${query}`} data-testid="builder-to-compare" className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track">
                {t("Mở trong So sánh", "Open in Compare")}
              </Link>
              <button type="button" data-testid="builder-download" onClick={download} className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track">
                {t("Tải định nghĩa (JSON)", "Download definition (JSON)")}
              </button>
            </div>
            <p className="text-xs text-muted">{t("Định dạng challenge-definition@1. Tệp được tạo ngay trong trình duyệt, không gửi đi đâu.", "Format challenge-definition@1. The file is made in your browser and sent nowhere.")}</p>
          </section>
        </>
      )}

      <section aria-labelledby={`${id}-imp`} className="space-y-2 rounded-lg border border-line bg-panel p-4">
        <h2 id={`${id}-imp`} className="text-base font-semibold">{t("Nhập định nghĩa", "Import a definition")}</h2>
        <label htmlFor={`${id}-file`} className="block text-sm text-muted">
          {t("Chọn tệp challenge-definition@1 (.json). Tệp được coi là không đáng tin và được kiểm tra trước khi dùng.", "Choose a challenge-definition@1 (.json) file. It is treated as untrusted and checked before use.")}
        </label>
        <input id={`${id}-file`} ref={fileRef} type="file" accept="application/json,.json" data-testid="builder-import" onChange={(e) => void onFile(e.target.files?.[0])} className="block text-sm" />
      </section>
    </main>
  );
}
