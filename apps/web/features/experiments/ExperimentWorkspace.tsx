"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChallengeConfig } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigCard } from "@/components/inspect/ChallengeConfigCard";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { CohortStrips } from "@/components/behavior/CohortStrips";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { EventStrip } from "@/components/behavior/EventStrip";
import { MOTION_CAPTCHAS, TrajectoryPanel } from "@/components/behavior/TrajectoryPanel";
import { HumanTask } from "@/features/compare/HumanTask";
import { definitionFromSearch, definitionQuery } from "@/features/builder/BuilderPage";
import { CLASSIFIER_VERSION, LABEL_TEXT, type ClassificationLabel } from "@/lib/behavior/classifier";
import type { SessionReport } from "@/lib/behavior/human";
import { SIGNALS_BY_CAPTCHA, formatSignal, groupLabel, signalDef, signalLabel } from "@/lib/behavior/signal-catalog";
import { PROFILES_BY_CAPTCHA, profileName } from "@/lib/behavior/synthetic";
import { BEHAVIOR_CAPTCHAS, BEHAVIOR_FEATURE_SET, SIGNAL_GROUPS, SYNTHETIC_GENERATOR_VERSION, isBehaviorCaptcha, type BehaviorCaptchaId } from "@/lib/behavior/types";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { randomSeed } from "@/lib/seed";
import { recordedRecord, syntheticRecord, type DatasetRecord } from "@/lib/dataset/records";
import { verifySyntheticProvenance } from "@/lib/dataset/format";
import { datasetStore, useDataset, useDatasetUnloadGuard } from "@/lib/dataset/store";
import { approxSize, describeError, downloadText, jsonText, readFileText } from "@/lib/research/browser";
import { MAX_SEED, generateChallenge, toDefinitionFile } from "@/lib/research/definition";
import {
  cohortSignalStats,
  cohortsOf,
  emptyExperiment,
  filterSamples,
  labelCounts,
  materialize,
  syntheticTotal,
  withRecorded,
  withSynthetic,
  withoutRecorded,
  withoutSynthetic,
  type Experiment,
  type Sample,
  type SampleFilter,
} from "@/lib/research/experiment";
import { importText, sessionJoins, toBundleFile, toSessionFile, toSummaryFile, type Imported } from "@/lib/research/formats";
import { MAX_DRAWN, MAX_RECORDED, MAX_RUNS_PER_SPEC, MAX_SYNTHETIC_SPECS, MAX_SYNTHETIC_TOTAL, safeFilename } from "@/lib/research/safe";

const ROW_CAP = 100;
const LABELS: readonly ClassificationLabel[] = ["human-like", "synthetic-like", "uncertain"];

type Notice = { kind: "ok" | "warn" | "error"; text: string };

const hasData = (e: Experiment | null): boolean => e !== null && (e.recorded.length > 0 || e.synthetic.length > 0);

function parseTags(text: string): string[] | null {
  const tags = text.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return tags.length <= 12 && tags.every((s) => /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/.test(s)) ? tags : null;
}

const fieldClass = "rounded-md border border-line bg-bg px-3 py-2 text-sm";
const btn = "rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-50";
const primary = "rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50";

/**
 * The research workspace: ONE challenge, any number of locally recorded sessions and generated batches, compared by
 * signal and by what the experimental baseline says. Everything is in memory. Nothing is saved unless the user
 * downloads a file; reloading discards it (a warning is shown, and the browser asks before leaving).
 */
export function ExperimentWorkspace() {
  const t = useT();
  const names = useMemo(() => new Map(catalogFor(t).map((c) => [c.id, c.name])), [t]);
  const [exp, setExp] = useState<Experiment | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [pending, setPending] = useState<Imported | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ kind: string; profile: string; label: string; group: string }>({ kind: "all", profile: "all", label: "all", group: "all" });
  const [stripSignal, setStripSignal] = useState<string>("");
  const [report, setReport] = useState<SessionReport | null>(null);
  const [recordKey, setRecordKey] = useState(0);
  const [recLabel, setRecLabel] = useState("");
  const [recTags, setRecTags] = useState("");
  const [synProfile, setSynProfile] = useState("");
  const [synSeed, setSynSeed] = useState("1");
  const [synRuns, setSynRuns] = useState("10");
  const [startCaptcha, setStartCaptcha] = useState<BehaviorCaptchaId>("slider");
  const [startSeed, setStartSeed] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dataset = useDataset();
  useDatasetUnloadGuard();
  // The latest committed experiment, read when an import finishes (the file is read asynchronously).
  const expRef = useRef<Experiment | null>(null);
  expRef.current = exp;

  const say = useCallback((n: Notice | Notice[]) => setNotices(Array.isArray(n) ? n : [n]), []);
  const fail = useCallback((err: unknown) => say({ kind: "error", text: describeError(err, t) }), [say, t]);

  // Everything derived from a replaced experiment starts clean: nothing from the previous one may survive.
  const adopt = useCallback((next: Experiment | null, extra: Notice[] = []) => {
    setExp(next);
    setSelected(new Set());
    setInspectId(null);
    setFilter({ kind: "all", profile: "all", label: "all", group: "all" });
    setStripSignal("");
    setReport(null);
    setRecordKey((k) => k + 1);
    setRecLabel("");
    setRecTags("");
    setSynProfile("");
    setConfirmClear(false);
    setPending(null);
    setDirty(false);
    setNotices(extra);
  }, []);

  // Start from the URL when it carries a valid definition (the Builder links here); else offer a quick start.
  useEffect(() => {
    const d = definitionFromSearch(window.location.search);
    if (d) adopt(emptyExperiment(d, d.name ?? ""));
    setStartSeed(String(randomSeed()));
  }, [adopt]);

  // Unsaved work: ask before the page is left or reloaded.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const captcha = exp?.definition.captcha ?? null;
  const defKey = exp ? definitionQuery(exp.definition) : "";
  const challenge = useMemo(() => {
    const d = definitionFromSearch(defKey);
    return d ? generateChallenge(d) : null;
  }, [defKey]);
  // Re-derived only when the sessions, batches or challenge change; typing a name or a note does not redo the work.
  const definition = exp?.definition;
  const recorded = exp?.recorded;
  const synthetic = exp?.synthetic;
  const samples = useMemo<Sample[]>(() => {
    if (!definition || !recorded || !synthetic) return [];
    try {
      return materialize({ name: "", notes: "", definition, recorded, synthetic });
    } catch (err) {
      console.error("Experiment analysis failed", err instanceof Error ? err.message : "unknown error");
      return [];
    }
  }, [definition, recorded, synthetic]);
  const bundleSize = useMemo(() => {
    if (!definition || !recorded || !synthetic) return "";
    try {
      return approxSize(jsonText(toBundleFile({ name: "", notes: "", definition, recorded, synthetic })));
    } catch {
      return "> 25 MB";
    }
  }, [definition, recorded, synthetic]);

  const shown = useMemo(() => {
    const f: SampleFilter = {
      kind: filter.kind === "all" ? "all" : (filter.kind as "recorded" | "synthetic"),
      profile: filter.profile,
      label: filter.label === "all" ? "all" : (filter.label as ClassificationLabel),
    };
    return filterSamples(samples, f);
  }, [samples, filter.kind, filter.profile, filter.label]);
  const cohorts = useMemo(() => (exp ? cohortsOf(exp, shown, t) : []), [exp, shown, t]);
  const inspected = samples.find((s) => s.id === inspectId) ?? null;
  const motion = captcha !== null && MOTION_CAPTCHAS.includes(captcha);
  const signalIds = captcha ? SIGNALS_BY_CAPTCHA[captcha].filter((s) => filter.group === "all" || signalDef(s)?.group === filter.group) : [];
  const chartSignal = stripSignal !== "" && signalIds.includes(stripSignal) ? stripSignal : (signalIds[0] ?? "");
  const chosen = shown.filter((s) => selected.has(s.id));
  const drawn = chosen.slice(0, MAX_DRAWN);

  // ------------------------------------------------------------------------------------------ actions

  const mutate = (fn: (e: Experiment) => Experiment): void => {
    if (!exp) return;
    try {
      setExp(fn(exp));
      setDirty(true);
      setNotices([]);
    } catch (err) {
      fail(err);
    }
  };

  const startNew = (): void => {
    const set = VARIANT_SETS[startCaptcha].defaultSelection;
    const seed = /^\d{1,10}$/.test(startSeed.trim()) && Number(startSeed.trim()) <= MAX_SEED ? Number(startSeed.trim()) : null;
    if (seed === null) return say({ kind: "error", text: t("Seed phải là số nguyên từ 0 đến 4294967295.", "The seed must be a whole number from 0 to 4294967295.") });
    adopt(emptyExperiment({ captcha: startCaptcha, variant: set.variantId, difficulty: set.difficulty, seed }));
  };

  const addRecorded = (): void => {
    if (!report) return;
    const tags = parseTags(recTags);
    if (tags === null) return say({ kind: "error", text: t("Nhãn: tối đa 12, mỗi nhãn gồm chữ, số, dấu cách, '-', '_' hoặc '.' (tối đa 40 ký tự).", "Tags: at most 12, each made of letters, digits, spaces, '-', '_' or '.' (up to 40 characters).") });
    mutate((e) => withRecorded(e, { label: recLabel.trim(), tags, context: report.context, passed: report.passed, session: report.session }));
    setReport(null);
    setRecLabel("");
    setRecTags("");
    setRecordKey((k) => k + 1);
  };

  const addSynthetic = (): void => {
    if (!exp) return;
    const profile = synProfile || (PROFILES_BY_CAPTCHA[exp.definition.captcha][1] ?? PROFILES_BY_CAPTCHA[exp.definition.captcha][0])!.id;
    const baseSeed = /^\d{1,10}$/.test(synSeed.trim()) ? Number(synSeed.trim()) : Number.NaN;
    const runs = /^\d{1,4}$/.test(synRuns.trim()) ? Number(synRuns.trim()) : Number.NaN;
    mutate((e) => withSynthetic(e, { profile, baseSeed, runs }));
  };

  const replaceWith = (imp: Imported): void => {
    if (imp.kind === "challenge") {
      adopt(emptyExperiment(imp.definition, imp.definition.name ?? ""), [{ kind: "ok", text: t("Đã nhập thử thách; thí nghiệm mới trống.", "Challenge imported; the new experiment is empty.") }]);
    } else if (imp.kind === "experiment") {
      const w = imp.parsed.warnings.map<Notice>((text) => ({ kind: "warn", text }));
      adopt(imp.parsed.experiment, [{ kind: "ok", text: t("Đã nhập thí nghiệm.", "Experiment imported.") }, ...w]);
    }
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setPending(null); // a newer import supersedes a confirmation that was still waiting
    try {
      const imp = importText(await readFileText(file));
      const current = expRef.current; // not the state captured when the file was chosen
      if (imp.kind === "session") {
        const base = current ?? emptyExperiment(imp.parsed.definition);
        sessionJoins(base, imp.parsed);
        const p = imp.parsed;
        setExp(withRecorded(base, { label: p.label, tags: p.tags, context: p.context, ...(p.passed === undefined ? {} : { passed: p.passed }), session: p.session, imported: true, source: p.source }));
        setDirty(true);
        say({ kind: "ok", text: t("Đã thêm phiên nhập vào thí nghiệm (đánh dấu là nhập từ tệp).", "Imported session added (marked as imported from a file).") });
      } else if (hasData(current)) {
        setPending(imp); // replacing data needs an explicit yes
        say([]);
      } else {
        replaceWith(imp);
      }
    } catch (err) {
      fail(err);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = (kind: "bundle" | "summary" | "challenge" | "session"): void => {
    if (!exp) return;
    try {
      let name: string;
      let text: string;
      if (kind === "bundle") {
        text = jsonText(toBundleFile(exp));
        name = safeFilename("experiment", exp.name || exp.definition.captcha, exp.definition.seed);
        setDirty(false);
      } else if (kind === "summary") {
        text = jsonText(toSummaryFile(exp, samples));
        name = safeFilename("summary", exp.name || exp.definition.captcha, exp.definition.seed);
      } else if (kind === "challenge") {
        text = jsonText(toDefinitionFile(exp.definition));
        name = safeFilename("challenge", exp.definition.captcha, exp.definition.seed);
      } else {
        if (!inspected) return;
        text = jsonText(
          toSessionFile(exp.definition, {
            kind: inspected.kind === "synthetic" || inspected.source?.kind === "synthetic" ? "synthetic" : "recorded",
            ...(inspected.profile ? { profile: inspected.profile } : inspected.source?.kind === "synthetic" ? { profile: inspected.source.profile } : {}),
            ...(inspected.seed !== undefined ? { seed: inspected.seed } : inspected.source?.kind === "synthetic" ? { seed: inspected.source.seed } : {}),
            session: inspected.session,
            context: inspected.context,
            label: inspected.label,
            tags: inspected.tags,
          }),
        );
        name = safeFilename("session", exp.definition.captcha, inspected.id.replace("#", "-"));
      }
      downloadText(name, text);
      say({ kind: "ok", text: `${name} · ${approxSize(text)}` });
    } catch (err) {
      fail(err);
    }
  };

  /** Adds one session of this experiment to the labeled dataset. Explicit, one at a time, never automatic. */
  const addToDataset = (s: Sample): void => {
    if (!exp) return;
    try {
      const entry = exp.recorded.find((r) => r.id === s.id);
      let draft: Omit<DatasetRecord, "id">;
      if (s.kind === "synthetic" && s.profile !== undefined && s.seed !== undefined) {
        draft = syntheticRecord({ definition: exp.definition, session: s.session, context: s.context, meta: { profile: s.profile, generator: SYNTHETIC_GENERATOR_VERSION, seed: s.seed } });
      } else if (!entry) {
        return;
      } else if (!entry.imported) {
        draft = recordedRecord({ definition: exp.definition, session: entry.session, context: entry.context, ...(entry.passed === undefined ? {} : { passed: entry.passed }), note: "" });
      } else {
        // From a file: the file's own claim about how it was made is kept (and checked), and the label stays Unknown.
        const claim = entry.source.kind === "synthetic" ? { profile: entry.source.profile, generator: entry.source.generator, seed: entry.source.seed } : null;
        const checked = claim ? verifySyntheticProvenance(exp.definition, entry.session, entry.context, claim, "session") : false;
        draft = {
          definition: exp.definition,
          source: { type: entry.source.kind === "synthetic" ? "synthetic" : "recorded", imported: true, ...(entry.source.kind === "synthetic" ? { synthetic: { profile: entry.source.profile, generator: entry.source.generator, seed: entry.source.seed }, provenanceChecked: checked } : {}) },
          label: "unknown",
          context: entry.context,
          ...(entry.passed === undefined ? {} : { passed: entry.passed }),
          note: "",
          session: entry.session,
        };
      }
      const id = datasetStore.add(draft);
      say({ kind: "ok", text: t(`Đã thêm vào bộ dữ liệu (${id}).`, `Added to the dataset (${id}).`) });
    } catch (err) {
      fail(err);
    }
  };

  const toggle = (id: string): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const profilesOf = captcha ? PROFILES_BY_CAPTCHA[captcha] : [];

  // -------------------------------------------------------------------------------------------- view

  const kindText = (s: Sample): string =>
    s.kind === "synthetic"
      ? t("Mô phỏng", "Synthetic")
      : s.imported
        ? s.source?.kind === "synthetic"
          ? t("Nhập từ tệp (nguồn: mô phỏng)", "Imported (source: synthetic)")
          : t("Nhập từ tệp (phiên đã ghi)", "Imported (recorded session)")
        : t("Phiên đã ghi", "Recorded session");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link prefetch={false} href="/behavior" className="text-sm text-muted underline">{t("Phòng thí nghiệm hành vi", "Behavioral Lab")}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Thí nghiệm", "Experiments")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Một thử thách, nhiều phiên đã ghi cục bộ và nhiều mẻ phiên mô phỏng, so sánh theo tín hiệu và theo cách bộ phân loại thử nghiệm đọc chúng. Xuất ra tệp để tái lập sau này.",
            "One challenge, any number of locally recorded sessions and generated batches, compared by signal and by how the experimental classifier reads them. Export to a file to reproduce it later.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <p className="rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid="exp-memory-note">
        {t(
          "Dữ liệu chỉ nằm trong bộ nhớ của thẻ này. Không có gì được lưu hay gửi đi; tải lại trang sẽ mất thí nghiệm chưa xuất. Phiên đã ghi chỉ là “phiên cục bộ”, không phải bộ dữ liệu người đã được xác thực.",
          "Data lives only in this tab's memory. Nothing is saved or sent, and reloading loses an experiment you have not exported. A recorded session is a “local session”, not a validated human dataset.",
        )}
      </p>

      {notices.length > 0 && (
        <div data-testid="exp-notice" className="space-y-1">
          {notices.map((n) => (
            <p key={n.text} role={n.kind === "error" ? "alert" : "status"} className={`text-sm ${n.kind === "error" ? "text-bad" : "text-muted"}`} data-kind={n.kind}>
              {n.kind === "warn" ? `${t("Lưu ý", "Note")}: ` : ""}
              {n.text}
            </p>
          ))}
        </div>
      )}

      {pending && (
        <section role="alertdialog" aria-labelledby="confirm-h" className="space-y-2 rounded-lg border border-line bg-panel p-4" data-testid="exp-confirm-replace">
          <h2 id="confirm-h" className="text-base font-semibold">{t("Thay thế thí nghiệm hiện tại?", "Replace the current experiment?")}</h2>
          <p className="text-sm text-muted">
            {t(
              `Thí nghiệm hiện có ${exp?.recorded.length ?? 0} phiên đã ghi và ${exp ? syntheticTotal(exp) : 0} phiên mô phỏng chưa chắc đã được xuất. Nhập tệp sẽ bỏ chúng.`,
              `The current experiment has ${exp?.recorded.length ?? 0} recorded and ${exp ? syntheticTotal(exp) : 0} synthetic sessions that may not be exported. Importing discards them.`,
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" data-testid="exp-confirm-yes" className={primary} onClick={() => replaceWith(pending)}>{t("Bỏ và nhập", "Discard and import")}</button>
            <button type="button" data-testid="exp-confirm-no" className={btn} onClick={() => setPending(null)}>{t("Giữ thí nghiệm hiện tại", "Keep the current experiment")}</button>
          </div>
        </section>
      )}

      {!exp && (
        <section aria-labelledby="start-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-start">
          <h2 id="start-h" className="text-base font-semibold">{t("Bắt đầu", "Start")}</h2>
          <p className="text-sm text-muted">
            {t("Dựng thử thách trong Trình dựng, nhập một tệp ở dưới, hoặc bắt đầu nhanh với thiết lập mặc định:", "Build a challenge in the Builder, import a file below, or start quickly with the defaults:")}{" "}
            <Link prefetch={false} href="/builder" className="underline" data-testid="exp-to-builder">{t("Mở trình dựng", "Open the builder")}</Link>
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="exp-start-captcha" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">CAPTCHA</label>
              <select id="exp-start-captcha" data-testid="exp-start-captcha" value={startCaptcha} onChange={(e) => isBehaviorCaptcha(e.target.value) && setStartCaptcha(e.target.value)} className={fieldClass}>
                {BEHAVIOR_CAPTCHAS.map((c) => <option key={c} value={c}>{names.get(c) ?? c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-start-seed" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Seed</label>
              <input id="exp-start-seed" data-testid="exp-start-seed" inputMode="numeric" value={startSeed} onChange={(e) => setStartSeed(e.target.value)} className={`${fieldClass} w-40 font-mono`} />
            </div>
            <button type="button" data-testid="exp-start-button" className={primary} onClick={startNew}>{t("Bắt đầu thí nghiệm", "Start an experiment")}</button>
          </div>
        </section>
      )}

      {exp && captcha && challenge !== null && (
        <>
          <section aria-labelledby="def-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-definition">
            <h2 id="def-h" className="text-base font-semibold">{t("1. Thử thách", "1. Challenge")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="exp-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Tên thí nghiệm", "Experiment name")}</label>
                <input id="exp-name" data-testid="exp-name" maxLength={80} value={exp.name} onChange={(e) => { setExp({ ...exp, name: e.target.value }); setDirty(true); }} className={`${fieldClass} w-full`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="exp-notes" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Ghi chú (văn bản thuần)", "Notes (plain text)")}</label>
                <textarea id="exp-notes" data-testid="exp-notes" maxLength={5000} rows={3} value={exp.notes} onChange={(e) => { setExp({ ...exp, notes: e.target.value }); setDirty(true); }} className={`${fieldClass} w-full`} />
              </div>
            </div>
            <ChallengeConfigCard captcha={captcha} config={(challenge as { config?: ChallengeConfig }).config} />
            <p className="text-xs text-muted" data-testid="exp-versions">
              {t("Phiên bản", "Versions")}: <span className="font-mono">{SYNTHETIC_GENERATOR_VERSION}</span> · <span className="font-mono">{BEHAVIOR_FEATURE_SET}</span> · <span className="font-mono">{CLASSIFIER_VERSION}</span>
            </p>
            <p className="flex flex-wrap gap-4 text-sm">
              <Link prefetch={false} href={`/compare?${definitionQuery(exp.definition)}`} className="underline" data-testid="exp-to-compare">{t("Mở thử thách này trong So sánh", "Open this challenge in Compare")}</Link>
              <Link prefetch={false} href={`/builder?${definitionQuery(exp.definition)}`} className="underline" data-testid="exp-edit-builder">{t("Sửa trong Trình dựng (sẽ bắt đầu thí nghiệm mới)", "Edit in the Builder (starts a new experiment)")}</Link>
            </p>
          </section>

          <section aria-labelledby="rec-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-record">
            <h2 id="rec-h" className="text-base font-semibold">{t("2. Ghi một phiên cục bộ", "2. Record a local session")}</h2>
            <p className="text-sm text-muted">{t("Làm thử thách rồi bấm “Thêm phiên vào thí nghiệm”. Có thể lặp lại; mỗi phiên là một lần thử riêng.", "Complete the challenge, then press “Add this session to the experiment”. Repeat as often as you like; each session is a separate attempt.")}</p>
            <HumanTask key={recordKey} captchaId={captcha} challenge={challenge} onNewChallenge={() => setRecordKey((k) => k + 1)} onResult={setReport} onReset={() => setReport(null)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="exp-rec-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Nhãn phiên (tuỳ chọn)", "Session label (optional)")}</label>
                <input id="exp-rec-label" data-testid="exp-record-label" maxLength={80} value={recLabel} onChange={(e) => setRecLabel(e.target.value)} className={`${fieldClass} w-full`} />
              </div>
              <div>
                <label htmlFor="exp-rec-tags" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Thẻ, cách nhau bằng dấu phẩy (tuỳ chọn)", "Tags, comma-separated (optional)")}</label>
                <input id="exp-rec-tags" data-testid="exp-record-tags" maxLength={200} value={recTags} onChange={(e) => setRecTags(e.target.value)} placeholder="run-1, test-condition-a" className={`${fieldClass} w-full`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" data-testid="exp-add-recorded" disabled={!report || exp.recorded.length >= MAX_RECORDED} onClick={addRecorded} className={primary}>
                {t("Thêm phiên vào thí nghiệm", "Add this session to the experiment")}
              </button>
              <p role="status" className="text-sm text-muted" data-testid="exp-record-status">
                {report ? (report.passed ? t("Có một phiên sẵn sàng (đạt).", "A session is ready (passed).") : t("Có một phiên sẵn sàng (chưa đạt).", "A session is ready (not passed).")) : t("Chưa có phiên nào để thêm.", "No session to add yet.")}
                {` ${exp.recorded.length}/${MAX_RECORDED}`}
              </p>
            </div>
          </section>

          <section aria-labelledby="syn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-synthetic">
            <h2 id="syn-h" className="text-base font-semibold">{t("3. Sinh các phiên mô phỏng", "3. Generate synthetic sessions")}</h2>
            <p className="text-sm text-muted">
              {t(`Lần chạy thứ i dùng seed = seed gốc + i. Cùng cấu hình luôn cho cùng các phiên. Tối đa ${MAX_RUNS_PER_SPEC} lần mỗi mẻ, ${MAX_SYNTHETIC_SPECS} mẻ và ${MAX_SYNTHETIC_TOTAL} lần tổng cộng.`, `Run i uses seed = base seed + i. The same configuration always gives the same sessions. At most ${MAX_RUNS_PER_SPEC} runs per batch, ${MAX_SYNTHETIC_SPECS} batches and ${MAX_SYNTHETIC_TOTAL} runs in total.`)}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="exp-syn-profile" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Mẫu mô phỏng", "Synthetic profile")}</label>
                <select id="exp-syn-profile" data-testid="exp-syn-profile" value={synProfile || (profilesOf[1] ?? profilesOf[0])?.id} onChange={(e) => setSynProfile(e.target.value)} className={fieldClass}>
                  {profilesOf.map((p) => <option key={p.id} value={p.id}>{profileName(captcha, p.id, t)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-syn-seed" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Seed gốc", "Base seed")}</label>
                <input id="exp-syn-seed" data-testid="exp-syn-seed" inputMode="numeric" value={synSeed} onChange={(e) => setSynSeed(e.target.value)} className={`${fieldClass} w-36 font-mono`} />
              </div>
              <div>
                <label htmlFor="exp-syn-runs" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Số lần chạy", "Runs")}</label>
                <input id="exp-syn-runs" data-testid="exp-syn-runs" inputMode="numeric" value={synRuns} onChange={(e) => setSynRuns(e.target.value)} className={`${fieldClass} w-24 font-mono`} />
              </div>
              <button type="button" data-testid="exp-add-synthetic" className={primary} onClick={addSynthetic}>{t("Thêm mẻ mô phỏng", "Add synthetic batch")}</button>
            </div>
            {exp.synthetic.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="exp-batches">
                  <caption className="sr-only">{t("Các mẻ mô phỏng", "Synthetic batches")}</caption>
                  <thead><tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Mẻ", "Batch")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Mẫu", "Profile")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Seed gốc", "Base seed")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Số lần", "Runs")}</th>
                    <th scope="col" className="py-1 font-medium"><span className="sr-only">{t("Xoá", "Remove")}</span></th>
                  </tr></thead>
                  <tbody>
                    {exp.synthetic.map((s) => (
                      <tr key={s.id} className="border-b border-line/50" data-testid={`exp-batch-${s.id}`}>
                        <th scope="row" className="py-1 pr-3 font-normal">{s.id}</th>
                        <td className="py-1 pr-3">{profileName(captcha, s.profile, t)}</td>
                        <td className="py-1 pr-3 font-mono">{s.baseSeed}</td>
                        <td className="py-1 pr-3 font-mono">{s.runs}</td>
                        <td className="py-1"><button type="button" data-testid={`exp-batch-remove-${s.id}`} className={btn} onClick={() => mutate((e) => withoutSynthetic(e, s.id))}>{t("Xoá mẻ", "Remove batch")}<span className="sr-only"> {s.id}</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="ses-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-sessions">
            <h2 id="ses-h" className="text-base font-semibold">{t("4. Các phiên", "4. Sessions")}</h2>
            <p className="text-xs text-muted" data-testid="exp-dataset-link">
              <Link prefetch={false} href="/experiments/dataset" className="underline">{t(`Bộ dữ liệu có nhãn (${dataset.records.length} phiên)`, `Labeled dataset (${dataset.records.length} sessions)`)}</Link>
              {" · "}<Link prefetch={false} href="/experiments/evaluation" className="underline" data-testid="exp-evaluation-link">{t("Đánh giá bộ phân loại", "Classifier evaluation")}</Link>
              {" · "}{t("Thêm từng phiên vào đó bằng nút “Thêm vào bộ dữ liệu”; không có gì được thêm tự động.", "Add sessions one by one with the “Add to dataset” button; nothing is added automatically.")}
            </p>
            <div className="flex flex-wrap gap-3" role="group" aria-label={t("Bộ lọc", "Filters")}>
              <div>
                <label htmlFor="exp-filter-kind" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Loại", "Kind")}</label>
                <select id="exp-filter-kind" data-testid="exp-filter-kind" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} className={fieldClass}>
                  <option value="all">{t("Tất cả", "All")}</option>
                  <option value="recorded">{t("Phiên đã ghi / nhập", "Recorded / imported")}</option>
                  <option value="synthetic">{t("Mô phỏng", "Synthetic")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="exp-filter-profile" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Mẫu mô phỏng", "Synthetic profile")}</label>
                <select id="exp-filter-profile" data-testid="exp-filter-profile" value={filter.profile} onChange={(e) => setFilter({ ...filter, profile: e.target.value })} className={fieldClass}>
                  <option value="all">{t("Tất cả", "All")}</option>
                  {profilesOf.map((p) => <option key={p.id} value={p.id}>{profileName(captcha, p.id, t)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-filter-label" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Kết quả phân loại", "Classifier output")}</label>
                <select id="exp-filter-label" data-testid="exp-filter-label" value={filter.label} onChange={(e) => setFilter({ ...filter, label: e.target.value })} className={fieldClass}>
                  <option value="all">{t("Tất cả", "All")}</option>
                  {LABELS.map((l) => <option key={l} value={l}>{t(LABEL_TEXT[l][1], LABEL_TEXT[l][0])}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-filter-group" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Nhóm tín hiệu", "Signal group")}</label>
                <select id="exp-filter-group" data-testid="exp-filter-group" value={filter.group} onChange={(e) => setFilter({ ...filter, group: e.target.value })} className={fieldClass}>
                  <option value="all">{t("Tất cả", "All")}</option>
                  {SIGNAL_GROUPS.filter((g) => g !== "input" && SIGNALS_BY_CAPTCHA[captcha].some((s) => signalDef(s)?.group === g)).map((g) => <option key={g} value={g}>{groupLabel(g, t)}</option>)}
                </select>
              </div>
            </div>
            <p className="text-sm text-muted" role="status" data-testid="exp-shown-count">
              {t(`Đang hiển thị ${shown.length} trên ${samples.length} phiên.`, `Showing ${shown.length} of ${samples.length} sessions.`)}
              {shown.length > ROW_CAP ? t(` Bảng chỉ liệt kê ${ROW_CAP} phiên đầu.`, ` The table lists the first ${ROW_CAP}.`) : ""}
            </p>
            {samples.length === 0 ? (
              <p className="text-sm text-muted" data-testid="exp-empty">{t("Chưa có phiên nào. Ghi một phiên hoặc thêm một mẻ mô phỏng.", "No sessions yet. Record one or add a synthetic batch.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="exp-samples">
                  <caption className="sr-only">{t("Các phiên trong thí nghiệm", "Sessions in the experiment")}</caption>
                  <thead><tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Chọn", "Select")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Phiên", "Session")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Nguồn", "Source")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Kết quả phân loại", "Classifier output")}</th>
                    <th scope="col" className="py-1 font-medium">{t("Thao tác", "Actions")}</th>
                  </tr></thead>
                  <tbody>
                    {shown.slice(0, ROW_CAP).map((s) => (
                      <tr key={s.id} className="border-b border-line/50" data-testid={`sample-${s.id}`}>
                        <td className="py-1 pr-3">
                          <input type="checkbox" data-testid={`sample-select-${s.id}`} aria-label={`${t("Chọn", "Select")} ${s.label}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                        </td>
                        <th scope="row" className="py-1 pr-3 font-normal">
                          {s.label}
                          {s.tags.length > 0 && <span className="block text-xs text-muted">{s.tags.join(", ")}</span>}
                        </th>
                        <td className="py-1 pr-3">{kindText(s)}</td>
                        <td className="py-1 pr-3" data-testid={`sample-label-${s.id}`} data-label={s.classification.label}>{t(LABEL_TEXT[s.classification.label][1], LABEL_TEXT[s.classification.label][0])}</td>
                        <td className="py-1">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" data-testid={`sample-inspect-${s.id}`} className={btn} onClick={() => setInspectId(s.id)} aria-pressed={inspectId === s.id}>{t("Xem bằng chứng", "Inspect evidence")}<span className="sr-only"> {s.label}</span></button>
                            <button type="button" data-testid={`sample-dataset-${s.id}`} className={btn} onClick={() => addToDataset(s)}>{t("Thêm vào bộ dữ liệu", "Add to dataset")}<span className="sr-only"> {s.label}</span></button>
                            {s.kind === "recorded" && <button type="button" data-testid={`sample-remove-${s.id}`} className={btn} onClick={() => mutate((e) => withoutRecorded(e, s.id))}>{t("Xoá", "Remove")}<span className="sr-only"> {s.label}</span></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" data-testid="exp-select-shown" className={btn} onClick={() => setSelected(new Set(shown.slice(0, MAX_DRAWN).map((s) => s.id)))}>{t(`Chọn các phiên đang hiển thị (tối đa ${MAX_DRAWN})`, `Select the shown sessions (up to ${MAX_DRAWN})`)}</button>
              <button type="button" data-testid="exp-clear-selection" className={btn} onClick={() => setSelected(new Set())}>{t("Bỏ chọn", "Clear selection")}</button>
            </div>
          </section>

          {inspected && (
            <section aria-labelledby="insp-h" className="space-y-3" data-testid="exp-inspect">
              <h2 id="insp-h" className="text-base font-semibold">{t("Bằng chứng của một phiên", "Evidence of one session")}</h2>
              <p className="text-xs text-muted" data-testid="exp-inspect-source">
                {inspected.label} · {kindText(inspected)}
                {inspected.profile ? ` · ${profileName(captcha, inspected.profile, t)} · seed ${inspected.seed} · ${SYNTHETIC_GENERATOR_VERSION}` : ""}
                {inspected.source?.kind === "synthetic" ? ` · ${profileName(captcha, inspected.source.profile, t)} · seed ${inspected.source.seed} · ${inspected.source.generator}` : ""}
              </p>
              <ClassifierDisclaimer />
              <ClassificationCard title={inspected.label} classification={inspected.classification} testId="exp-class" />
              <div className="flex gap-3">
                <button type="button" data-testid="exp-download-session" className={btn} onClick={() => save("session")}>{t("Tải phiên này (JSON)", "Download this session (JSON)")}</button>
                <button type="button" className={btn} onClick={() => setInspectId(null)}>{t("Đóng", "Close")}</button>
              </div>
            </section>
          )}

          <section aria-labelledby="sum-h" className="space-y-4" data-testid="exp-summary">
            <h2 id="sum-h" className="text-base font-semibold">{t("5. Tóm tắt", "5. Summary")}</h2>
            <Card id="counts-h" title={t("Kết quả phân loại (đếm)", "Classifier outputs (counts)")}>
              <p className="mb-2 text-xs text-muted">{t("Đây là số lần mỗi kết quả xuất hiện, không phải độ chính xác hay xác suất.", "These are how many times each output occurred. They are not accuracy and not probabilities.")}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="exp-counts">
                  <caption className="sr-only">{t("Số lượng kết quả phân loại theo nhóm", "Counts of classifier outputs per cohort")}</caption>
                  <thead><tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Nhóm", "Cohort")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Số phiên", "Sessions")}</th>
                    {LABELS.map((l) => <th key={l} scope="col" className="py-1 pr-3 font-medium">{t(LABEL_TEXT[l][1], LABEL_TEXT[l][0])}</th>)}
                  </tr></thead>
                  <tbody>
                    {cohorts.map((c) => {
                      const n = labelCounts(c.samples);
                      return (
                        <tr key={c.id} className="border-b border-line/50" data-testid={`counts-${c.id}`}>
                          <th scope="row" className="py-1 pr-3 font-normal">{c.label}</th>
                          <td className="py-1 pr-3 font-mono">{c.samples.length}</td>
                          {LABELS.map((l) => <td key={l} className="py-1 pr-3 font-mono" data-testid={`counts-${c.id}-${l}`}>{n[l]}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card id="stats-h" title={t("Thống kê mô tả theo tín hiệu", "Descriptive statistics per signal")}>
              <p className="mb-2 text-xs text-muted">
                {t("n = số giá trị đo được; thiếu = số phiên không đo được tín hiệu đó (không tính là 0). Chỉ là mô tả, không có kiểm định hay ý nghĩa thống kê.", "n = values measured; missing = sessions where the signal could not be measured (never counted as 0). Descriptive only: no test and no claim of significance.")}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" data-testid="exp-stats">
                  <caption className="sr-only">{t("Thống kê mô tả của từng tín hiệu theo nhóm", "Descriptive statistics of each signal per cohort")}</caption>
                  <thead><tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
                    {cohorts.map((c) => <th key={c.id} scope="col" className="py-1 pr-3 font-medium">{c.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {signalIds.map((sig) => (
                      <tr key={sig} className="border-b border-line/50 align-top">
                        <th scope="row" className="py-1 pr-3 font-normal">{signalLabel(sig, t)}<span className="block text-muted">{groupLabel(signalDef(sig)?.group ?? "timing", t)}</span></th>
                        {cohorts.map((c) => {
                          const st = cohortSignalStats(c.samples, captcha).find((x) => x.signal === sig)!;
                          return (
                            <td key={c.id} className="py-1 pr-3 font-mono" data-testid={`stat-${c.id}-${sig}`}>
                              n={st.count} · {t("thiếu", "missing")}={st.missing}
                              {st.count > 0 && (
                                <span className="block">
                                  {formatSignal(sig, st.min)}–{formatSignal(sig, st.max)}
                                  <span className="block">{t("tb", "mean")} {formatSignal(sig, st.mean)} · {t("trung vị", "median")} {formatSignal(sig, st.median)}</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card id="strips-h" title={t("Phân bố theo nhóm", "Distribution per cohort")}>
              <div className="mb-3">
                <label htmlFor="exp-strip-signal" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Tín hiệu", "Signal")}</label>
                <select id="exp-strip-signal" data-testid="exp-strip-signal" value={chartSignal} onChange={(e) => setStripSignal(e.target.value)} className={fieldClass}>
                  {signalIds.map((s) => <option key={s} value={s}>{signalLabel(s, t)}</option>)}
                </select>
              </div>
              {chartSignal !== "" && <CohortStrips testId="exp-strips" signal={chartSignal} rows={cohorts.map((c) => ({ id: c.id, label: c.label, values: c.samples.map((s) => s.vector.values[chartSignal]) }))} />}
              <p className="mt-2 text-xs text-muted">{t("Mỗi chấm là một phiên; các giá trị thiếu không được vẽ. Bảng thống kê ở trên có cùng các con số dưới dạng văn bản.", "Each dot is one session; missing values are not drawn. The statistics table above holds the same numbers as text.")}</p>
            </Card>
          </section>

          <section aria-labelledby="sel-h" className="space-y-3" data-testid="exp-selected-views">
            <h2 id="sel-h" className="text-base font-semibold">{motion ? t("6. Chồng đường đi các phiên đã chọn", "6. Trajectories of the selected sessions") : t("6. Dòng thời gian các phiên đã chọn", "6. Timelines of the selected sessions")}</h2>
            {chosen.length === 0 ? (
              <p className="text-sm text-muted" data-testid="exp-selected-empty">{t("Chọn vài phiên ở bảng trên để so sánh trực quan.", "Select a few sessions in the table above to compare them visually.")}</p>
            ) : (
              <>
                {chosen.length > MAX_DRAWN && <p role="status" className="text-sm text-muted" data-testid="exp-draw-cap">{t(`Chỉ vẽ ${MAX_DRAWN} phiên đầu trong ${chosen.length} phiên đã chọn.`, `Drawing the first ${MAX_DRAWN} of ${chosen.length} selected sessions.`)}</p>}
                <ul className="grid gap-3 md:grid-cols-2">
                  {drawn.map((s) => (
                    <li key={s.id} className="min-w-0 rounded-lg border border-line bg-panel p-3" data-testid={`view-${s.id}`}>
                      <p className="mb-1 text-xs font-medium">{s.label}</p>
                      {motion ? (
                        <TrajectoryPanel captchaId={captcha as "slider" | "drag-drop" | "rotation"} challenge={challenge} session={s.session} context={s.context} label={s.label} testId={`traj-${s.id}`} />
                      ) : (
                        <EventStrip session={s.session} maxT={Math.max(...drawn.map((d) => d.session.durationMs))} label={s.label} testId={`strip-${s.id}`} />
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="exp-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="exp-export">
            <h2 id="exp-h" className="text-base font-semibold">{t("7. Xuất", "7. Export")}</h2>
            <div className="flex flex-wrap gap-3">
              <button type="button" data-testid="exp-download-bundle" className={primary} onClick={() => save("bundle")}>{t("Tải thí nghiệm (experiment-bundle@1)", "Download experiment (experiment-bundle@1)")}</button>
              <button type="button" data-testid="exp-download-summary" className={btn} onClick={() => save("summary")}>{t("Tải tóm tắt (experiment-summary@1)", "Download summary (experiment-summary@1)")}</button>
              <button type="button" data-testid="exp-download-challenge" className={btn} onClick={() => save("challenge")}>{t("Tải thử thách (challenge-definition@1)", "Download challenge (challenge-definition@1)")}</button>
            </div>
            <p className="text-xs text-muted" data-testid="exp-size">
              {t("Kích thước thí nghiệm khi xuất khoảng", "Approximate experiment export size")}: {bundleSize}. {t("Tệp được tạo trong trình duyệt và không gửi đi đâu. Mẻ mô phỏng chỉ xuất công thức sinh, vì cùng seed cho đúng cùng dữ liệu.", "Files are made in the browser and sent nowhere. Synthetic batches export only their recipe, because the same seeds give exactly the same data.")}
            </p>
            {dirty && <p role="status" className="text-xs text-muted" data-testid="exp-unsaved">{t("Có thay đổi chưa xuất. Tải lại trang sẽ làm mất chúng.", "There are changes you have not exported. Reloading the page would lose them.")}</p>}
          </section>
        </>
      )}

      <section aria-labelledby="imp-h" className="space-y-2 rounded-lg border border-line bg-panel p-4" data-testid="exp-import">
        <h2 id="imp-h" className="text-base font-semibold">{t("Nhập tệp", "Import a file")}</h2>
        <label htmlFor="exp-import-file" className="block text-sm text-muted">
          {t("Chọn một tệp experiment-bundle@1, interaction-session@1 hoặc challenge-definition@1 (.json). Tệp được coi là không đáng tin, được kiểm tra chặt (kể cả khoá lạ) trước khi dùng, và chỉ là dữ liệu.", "Choose an experiment-bundle@1, interaction-session@1 or challenge-definition@1 (.json) file. It is treated as untrusted, checked strictly (unknown keys included) before use, and is only ever data.")}
        </label>
        <input id="exp-import-file" ref={fileRef} type="file" accept="application/json,.json" data-testid="exp-import-file" onChange={(e) => void onFile(e.target.files?.[0])} className="block text-sm" />
      </section>

      {exp && (
        <section className="space-y-2" data-testid="exp-reset">
          {!confirmClear ? (
            <button type="button" data-testid="exp-clear" className={btn} onClick={() => setConfirmClear(true)}>{t("Xoá thí nghiệm", "Clear the experiment")}</button>
          ) : (
            <div role="alertdialog" aria-label={t("Xác nhận xoá", "Confirm clearing")} className="flex flex-wrap items-center gap-3 text-sm">
              <span>{t("Xoá toàn bộ phiên và mẻ trong bộ nhớ?", "Discard every session and batch in memory?")}</span>
              <button type="button" data-testid="exp-clear-yes" className={primary} onClick={() => adopt(null)}>{t("Xoá", "Clear")}</button>
              <button type="button" data-testid="exp-clear-no" className={btn} onClick={() => setConfirmClear(false)}>{t("Giữ lại", "Keep")}</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
