"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ChallengeConfig } from "@captchalab/captcha-core";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigCard } from "@/components/inspect/ChallengeConfigCard";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { LABEL_TEXT, type ClassificationLabel } from "@/lib/behavior/classifier";
import { signalRows } from "@/lib/behavior/compare";
import { groupLabel, signalLabel } from "@/lib/behavior/signal-catalog";
import { profileName } from "@/lib/behavior/synthetic";
import { catalogFor } from "@/lib/catalog";
import { importDataset, toDatasetFile, type DatasetImport } from "@/lib/dataset/format";
import { GROUND_TRUTH_LABELS, MAX_DATASET_EVENTS, MAX_DATASET_RECORDS, analyzeRecord, isLabel, isLabelLocked, summarizeDataset, type DatasetRecord, type GroundTruthLabel, type RecordAnalysis } from "@/lib/dataset/records";
import { datasetStore, useDataset, useDatasetUnloadGuard } from "@/lib/dataset/store";
import { useT } from "@/lib/i18n";
import { approxSize, describeError, downloadText, jsonText, readFileText } from "@/lib/research/browser";
import { generateChallenge } from "@/lib/research/definition";
import { MAX_IMPORT_BYTES, safeFilename } from "@/lib/research/safe";

const btn = "rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-50";
const primary = "rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50";
const OUTPUTS: readonly ClassificationLabel[] = ["human-like", "synthetic-like", "uncertain"];

const LABEL_NAME: Record<GroundTruthLabel, readonly [string, string]> = {
  human: ["Người", "Human"],
  synthetic: ["Mô phỏng", "Synthetic"],
  unknown: ["Chưa rõ", "Unknown"],
};

type Notice = { kind: "ok" | "error"; text: string };

/**
 * The local labeled dataset: sessions the user chose to add, each with a label a person gave, its source, and the
 * CURRENT classifier's reading shown beside (never merged with) that label. In memory only: nothing is stored or sent
 * until the user exports a file. No accuracy, precision or recall is computed here: that needs the evaluation step.
 */
export function DatasetPage() {
  const t = useT();
  const { records, dirty } = useDataset();
  useDatasetUnloadGuard();
  const names = useMemo(() => new Map(catalogFor(t).map((c) => [c.id, c.name])), [t]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [report, setReport] = useState<DatasetImport | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Signals and the classifier reading are derived from each record's session, never stored.
  const analyses = useMemo(() => {
    const m = new Map<string, RecordAnalysis>();
    for (const r of records) {
      try {
        m.set(r.id, analyzeRecord(r));
      } catch (err) {
        console.error("Record analysis failed", err instanceof Error ? err.message : "unknown error");
      }
    }
    return m;
  }, [records]);
  const summary = useMemo(() => summarizeDataset(records, analyses), [records, analyses]);
  const viewed = records.find((r) => r.id === viewId) ?? null;
  const viewedAnalysis = viewed ? analyses.get(viewed.id) : undefined;

  const run = (fn: () => void): void => {
    try {
      setNotice(null);
      fn();
    } catch (err) {
      setNotice({ kind: "error", text: describeError(err, t) });
    }
  };

  const exportAll = (): void =>
    run(() => {
      const text = jsonText(toDatasetFile(records));
      const name = safeFilename("dataset", new Date().toISOString().slice(0, 10));
      downloadText(name, text);
      datasetStore.markExported();
      setNotice({ kind: "ok", text: `${name} · ${approxSize(text)}` });
    });

  const exportOne = (r: DatasetRecord): void =>
    run(() => {
      const text = jsonText(toDatasetFile([r]));
      const name = safeFilename("record", r.definition.captcha, r.id);
      downloadText(name, text);
      setNotice({ kind: "ok", text: `${name} · ${approxSize(text)}` });
    });

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setReport(null);
    try {
      const result = importDataset(await readFileText(file), datasetStore.get().records);
      datasetStore.replaceAll(result.records, datasetStore.get().dirty || result.imported > 0);
      setReport(result);
      setNotice(null);
    } catch (err) {
      setNotice({ kind: "error", text: describeError(err, t) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sourceText = (r: DatasetRecord): string => {
    const base = r.source.type === "synthetic" ? t("mô phỏng", "synthetic") : t("đã ghi", "recorded");
    return r.source.imported ? `${t("Nhập từ tệp", "Imported")} (${base})` : r.source.type === "synthetic" ? t("Mô phỏng", "Synthetic") : t("Đã ghi", "Recorded");
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link prefetch={false} href="/experiments" className="text-sm text-muted underline">{t("Thí nghiệm", "Experiments")}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Bộ dữ liệu có nhãn", "Labeled dataset")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Gom các phiên bạn chọn cùng một nhãn do chính bạn đặt, để chuẩn bị cho việc đánh giá sau này. Nhãn và kết quả của bộ phân loại là hai thứ riêng: không cái nào sửa cái kia.",
            "Collect the sessions you choose, each with a label you set yourself, to prepare for evaluation later. The label and the classifier's reading are two separate things: neither changes the other.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <div className="space-y-2 rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid="ds-notes">
        <p data-testid="ds-memory-note">{t("Bộ dữ liệu này chỉ nằm trong thẻ trình duyệt này cho đến khi bạn xuất nó ra tệp. Tải lại trang sẽ làm mất nó.", "This dataset exists only in this browser tab until you export it. Reloading the page loses it.")}</p>
        <p data-testid="ds-label-note">{t("Nhãn là nhãn do người dùng đặt, không phải sự thật đã được xác minh. Phiên “đã ghi” không tự là phiên của người: nó mặc định “Chưa rõ”.", "A label is a user-provided label, not verified ground truth. A recorded session is not automatically a human one: it starts as Unknown.")}</p>
        <p data-testid="ds-privacy-note">{t("Tệp xuất có thể chứa dữ liệu sự kiện tương tác (toạ độ và thời gian; phím chỉ ở dạng nhóm, không phải ký tự đã gõ). Không có gì được gửi đi.", "Exported files may contain interaction event data (coordinates and times; keys only as classes, never the characters typed). Nothing is uploaded.")}</p>
      </div>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} data-testid="ds-notice" className={`text-sm ${notice.kind === "error" ? "text-bad" : "text-muted"}`}>
          {notice.text}
        </p>
      )}

      <section aria-labelledby="ds-sum-h" className="space-y-4" data-testid="ds-summary">
        <h2 id="ds-sum-h" className="text-base font-semibold">{t("Tóm tắt", "Summary")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card id="ds-total-h" title={t("Tổng số", "Total sessions")}>
            <p className="text-2xl font-semibold" data-testid="ds-total">{summary.total}</p>
            <p className="text-xs text-muted">{t(`Tối đa ${MAX_DATASET_RECORDS} phiên và ${MAX_DATASET_EVENTS.toLocaleString("en-US")} sự kiện.`, `At most ${MAX_DATASET_RECORDS} sessions and ${MAX_DATASET_EVENTS.toLocaleString("en-US")} events.`)}</p>
          </Card>
          <Card id="ds-labels-h" title={t("Nhãn (do người dùng đặt)", "Labels (user-provided)")}>
            <dl className="space-y-1 text-sm">
              {GROUND_TRUTH_LABELS.map((l) => (
                <div key={l} className="flex justify-between">
                  <dt>{t(LABEL_NAME[l][0], LABEL_NAME[l][1])}</dt>
                  <dd className="font-mono" data-testid={`ds-count-label-${l}`}>{summary.labels[l]}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card id="ds-sources-h" title={t("Nguồn", "Sources")}>
            <dl className="space-y-1 text-sm">
              {(["recorded", "synthetic", "imported"] as const).map((s) => (
                <div key={s} className="flex justify-between">
                  <dt>{s === "recorded" ? t("Đã ghi", "Recorded") : s === "synthetic" ? t("Mô phỏng", "Synthetic") : t("Nhập từ tệp", "Imported")}</dt>
                  <dd className="font-mono" data-testid={`ds-count-source-${s}`}>{summary.sources[s]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card id="ds-cov-h" title={t("Độ phủ CAPTCHA", "CAPTCHA coverage")}>
            {Object.keys(summary.captchas).length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <dl className="space-y-1 text-sm" data-testid="ds-coverage">
                {Object.entries(summary.captchas).map(([id, n]) => (
                  <div key={id} className="flex justify-between">
                    <dt>{names.get(id as never) ?? id}</dt>
                    <dd className="font-mono" data-testid={`ds-count-captcha-${id}`}>{n}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-2 text-xs text-muted">{t("Độ khó", "Difficulty")}: {Object.entries(summary.difficulties).map(([k, n]) => `${k} ${n}`).join(" · ") || "—"}</p>
            <p className="text-xs text-muted" data-testid="ds-variants">{t("Biến thể", "Variants")}: {Object.entries(summary.variants).map(([k, n]) => `${k} ${n}`).join(" · ") || "—"}</p>
          </Card>
          <Card id="ds-out-h" title={t("Kết quả hiện tại của bộ phân loại (đếm)", "Current classifier outputs (counts)")}>
            <dl className="space-y-1 text-sm" data-testid="ds-classifier-counts">
              {OUTPUTS.map((o) => (
                <div key={o} className="flex justify-between">
                  <dt>{t(LABEL_TEXT[o][1], LABEL_TEXT[o][0])}</dt>
                  <dd className="font-mono" data-testid={`ds-count-output-${o}`}>{summary.classifierOutputs[o]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted">{t("Đây là số lần mỗi kết quả xuất hiện, tách khỏi nhãn. Chưa có độ chính xác hay sự trùng khớp nào được tính.", "These count how often each output occurred, apart from the labels. No accuracy and no agreement is computed.")}</p>
          </Card>
        </div>
        {summary.completeness.length > 0 && (
          <Card id="ds-comp-h" title={t("Độ đầy đủ của tín hiệu", "Feature completeness")}>
            <p className="mb-2 text-xs text-muted">{t("Số phiên có giá trị trên số phiên mà CAPTCHA đó báo cáo tín hiệu. Giá trị thiếu là thiếu, không phải 0.", "Sessions with a value out of the sessions whose CAPTCHA reports the signal. A missing value is missing, not 0.")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="ds-completeness">
                <caption className="sr-only">{t("Độ đầy đủ của từng tín hiệu", "Completeness of each signal")}</caption>
                <thead><tr className="border-b border-line">
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
                  <th scope="col" className="py-1 font-medium">{t("Có giá trị", "With a value")}</th>
                </tr></thead>
                <tbody>
                  {summary.completeness.map((c) => (
                    <tr key={c.signal} className="border-b border-line/50" data-testid={`ds-comp-${c.signal}`}>
                      <th scope="row" className="py-1 pr-3 font-normal">{signalLabel(c.signal, t)}</th>
                      <td className="py-1 font-mono">{c.present} / {c.of}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="ds-rec-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="ds-records">
        <h2 id="ds-rec-h" className="text-base font-semibold">{t("Các phiên", "Sessions")}</h2>
        {records.length === 0 ? (
          <div className="space-y-2" data-testid="ds-empty">
            <p className="text-sm text-muted">{t("Chưa có phiên nào trong bộ dữ liệu này.", "No sessions in this dataset yet.")}</p>
            <p className="flex flex-wrap gap-4 text-sm">
              <Link prefetch={false} href="/experiments" className="underline" data-testid="ds-to-experiments">{t("Chạy một thí nghiệm", "Run an experiment")}</Link>
              <Link prefetch={false} href="/compare" className="underline">{t("So sánh người và mô phỏng", "Compare human and synthetic")}</Link>
              <span className="text-muted">{t("hoặc nhập một tệp ở dưới", "or import a file below")}</span>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="ds-table">
              <caption className="sr-only">{t("Các phiên trong bộ dữ liệu", "Sessions in the dataset")}</caption>
              <thead><tr className="border-b border-line">
                <th scope="col" className="py-1 pr-3 font-medium">{t("Phiên", "Session")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">CAPTCHA</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Biến thể", "Variant")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Độ khó", "Difficulty")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Nguồn", "Source")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Nhãn (người dùng đặt)", "Label (user-provided)")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Bộ phân loại", "Classifier")}</th>
                <th scope="col" className="py-1 font-medium">{t("Thao tác", "Actions")}</th>
              </tr></thead>
              <tbody>
                {records.map((r) => {
                  const a = analyses.get(r.id);
                  const locked = isLabelLocked(r);
                  return (
                    <tr key={r.id} className="border-b border-line/50 align-top" data-testid={`ds-row-${r.id}`}>
                      <th scope="row" className="py-1 pr-3 font-mono font-normal">{r.id}</th>
                      <td className="py-1 pr-3">{names.get(r.definition.captcha) ?? r.definition.captcha}</td>
                      <td className="py-1 pr-3">{r.definition.variant}</td>
                      <td className="py-1 pr-3">{r.definition.difficulty}</td>
                      <td className="py-1 pr-3" data-testid={`ds-source-${r.id}`}>{sourceText(r)}</td>
                      <td className="py-1 pr-3">
                        <label className="sr-only" htmlFor={`ds-label-${r.id}`}>{t("Nhãn của", "Label of")} {r.id}</label>
                        <select
                          id={`ds-label-${r.id}`}
                          data-testid={`ds-label-${r.id}`}
                          value={r.label}
                          disabled={locked}
                          title={locked ? t("Phiên do CaptchaLab sinh ra giữ nhãn “Mô phỏng”.", "A session generated by CaptchaLab keeps the label Synthetic.") : undefined}
                          onChange={(e) => run(() => isLabel(e.target.value) && datasetStore.setLabel(r.id, e.target.value))}
                          className="rounded-md border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                        >
                          {GROUND_TRUTH_LABELS.map((l) => <option key={l} value={l}>{t(LABEL_NAME[l][0], LABEL_NAME[l][1])}</option>)}
                        </select>
                      </td>
                      <td className="py-1 pr-3" data-testid={`ds-classifier-${r.id}`} data-label={a?.classification.label ?? ""}>
                        {a ? t(LABEL_TEXT[a.classification.label][1], LABEL_TEXT[a.classification.label][0]) : "—"}
                      </td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" data-testid={`ds-view-${r.id}`} aria-pressed={viewId === r.id} className={btn} onClick={() => setViewId(viewId === r.id ? null : r.id)}>{t("Xem", "View")}<span className="sr-only"> {r.id}</span></button>
                          <button type="button" data-testid={`ds-export-${r.id}`} className={btn} onClick={() => exportOne(r)}>{t("Xuất phiên", "Export record")}<span className="sr-only"> {r.id}</span></button>
                          <button type="button" data-testid={`ds-remove-${r.id}`} className={btn} onClick={() => { if (viewId === r.id) setViewId(null); run(() => datasetStore.remove(r.id)); }}>{t("Xoá", "Remove")}<span className="sr-only"> {r.id}</span></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewed && viewedAnalysis && (
        <section aria-labelledby="ds-det-h" className="space-y-4" data-testid="ds-detail">
          <h2 id="ds-det-h" className="text-base font-semibold">{t("Chi tiết phiên", "Session detail")} {viewed.id}</h2>
          <ChallengeConfigCard captcha={viewed.definition.captcha} config={(generateChallenge(viewed.definition) as { config?: ChallengeConfig }).config} />
          <Card id="ds-prov-h" title={t("Nguồn và nhãn", "Source and label")}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">{t("Nguồn", "Source")}</dt>
              <dd data-testid="ds-detail-source">{sourceText(viewed)}</dd>
              {viewed.source.synthetic && (
                <>
                  <dt className="text-muted">{t("Nguồn gốc mô phỏng", "Synthetic origin")}</dt>
                  <dd data-testid="ds-detail-synthetic">
                    {profileName(viewed.definition.captcha, viewed.source.synthetic.profile, t)} · {viewed.source.synthetic.generator} · seed {viewed.source.synthetic.seed}
                    {viewed.source.imported ? (viewed.source.provenanceChecked ? ` · ${t("đã kiểm tra lại bằng cách sinh lại", "checked by regenerating")}` : ` · ${t("chưa kiểm tra được", "not checked")}`) : ` · ${t("sinh bởi CaptchaLab", "generated by CaptchaLab")}`}
                  </dd>
                </>
              )}
              <dt className="text-muted">{t("Nhãn do người dùng đặt", "User-provided label")}</dt>
              <dd data-testid="ds-detail-label">{t(LABEL_NAME[viewed.label][0], LABEL_NAME[viewed.label][1])}</dd>
              <dt className="text-muted">{t("Phiên", "Session")}</dt>
              <dd className="font-mono text-xs" data-testid="ds-detail-session">{viewed.session.events.length} {t("sự kiện", "events")} · {(viewed.session.durationMs / 1000).toFixed(2)} s · {viewed.session.inputModality}</dd>
            </dl>
            <div className="mt-3">
              <label htmlFor="ds-note" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{t("Ghi chú (văn bản thuần, tối đa 200 ký tự)", "Note (plain text, up to 200 characters)")}</label>
              <input id="ds-note" data-testid="ds-note" maxLength={200} value={viewed.note} onChange={(e) => run(() => datasetStore.setNote(viewed.id, e.target.value))} className="w-full max-w-md rounded-md border border-line bg-bg px-3 py-2 text-sm" />
            </div>
          </Card>
          <ClassifierDisclaimer />
          <ClassificationCard title={t("Bộ phân loại hiện tại (tính lại)", "Current classifier (recomputed)")} classification={viewedAnalysis.classification} testId="ds-class" />
          {viewed.claims?.classifier && (
            <p className="text-xs text-muted" data-testid="ds-claimed-classifier">
              {t("Tệp đã khai báo (chỉ để tham khảo, không được tin)", "The file claimed (information only, not trusted)")}: {viewed.claims.classifier.version} → {viewed.claims.classifier.result}
            </p>
          )}
          <Card id="ds-feat-h" title={t("Tín hiệu hành vi (tính lại từ phiên)", "Behavioral features (recomputed from the session)")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="ds-features">
                <caption className="sr-only">{t("Tín hiệu của phiên", "Signals of the session")}</caption>
                <tbody>
                  {signalRows(viewedAnalysis.vector, null, viewed.definition.captcha, t).map((row) => (
                    <tr key={row.id} className="border-b border-line/50" data-testid={`ds-feat-${row.id}`}>
                      <th scope="row" className="py-1 pr-3 font-normal" title={row.description}>{row.label}<span className="block text-xs text-muted">{groupLabel(row.group, t)}</span></th>
                      <td className="py-1 font-mono">{row.human}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      <section aria-labelledby="ds-io-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="ds-io">
        <h2 id="ds-io-h" className="text-base font-semibold">{t("Xuất và nhập", "Export and import")}</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" data-testid="ds-export" className={primary} disabled={records.length === 0} onClick={exportAll}>{t("Xuất bộ dữ liệu", "Export dataset")}</button>
          {!confirmClear ? (
            <button type="button" data-testid="ds-clear" className={btn} disabled={records.length === 0} onClick={() => setConfirmClear(true)}>{t("Xoá bộ dữ liệu", "Clear dataset")}</button>
          ) : (
            <span role="alertdialog" aria-label={t("Xác nhận xoá", "Confirm clearing")} className="flex flex-wrap items-center gap-3 text-sm">
              <span>{dirty ? t("Có thay đổi chưa xuất. Xoá hết?", "There are unexported changes. Clear everything?") : t("Xoá hết các phiên trong bộ nhớ?", "Clear every session in memory?")}</span>
              <button type="button" data-testid="ds-clear-yes" className={primary} onClick={() => { datasetStore.clear(); setViewId(null); setReport(null); setConfirmClear(false); }}>{t("Xoá", "Clear")}</button>
              <button type="button" data-testid="ds-clear-no" className={btn} onClick={() => setConfirmClear(false)}>{t("Giữ lại", "Keep")}</button>
            </span>
          )}
        </div>
        {dirty && records.length > 0 && <p role="status" className="text-xs text-muted" data-testid="ds-unsaved">{t("Có thay đổi chưa xuất. Tải lại trang sẽ làm mất chúng.", "There are changes you have not exported. Reloading the page would lose them.")}</p>}
        <div>
          <label htmlFor="ds-import-file" className="block text-sm text-muted">
            {t(`Nhập tệp captchalab-labeled-dataset@1 (.json, tối đa ${MAX_IMPORT_BYTES / 1048576} MB). Tệp được coi là không đáng tin: tín hiệu và kết quả phân loại luôn được tính lại, nhãn được giữ như người dùng đặt, và các phiên hợp lệ được nối vào bộ dữ liệu hiện tại.`, `Import a captchalab-labeled-dataset@1 (.json, up to ${MAX_IMPORT_BYTES / 1048576} MB) file. It is treated as untrusted: signals and the classifier's reading are always recomputed, labels are kept as the user gave them, and valid sessions are appended to the current dataset.`)}
          </label>
          <input id="ds-import-file" ref={fileRef} type="file" accept="application/json,.json" data-testid="ds-import-file" onChange={(e) => void onFile(e.target.files?.[0])} className="mt-1 block text-sm" />
        </div>
        {report && (
          <div className="space-y-1 text-sm" data-testid="ds-import-report" role="status">
            <p data-testid="ds-import-summary">
              {report.imported} {t("đã nhập", "imported")}, {report.rejected.length} {t("bị từ chối", "rejected")}
              {report.renamed.length > 0 ? `, ${report.renamed.length} ${t("đổi id", "renamed")}` : ""}
            </p>
            {report.rejected.length > 0 && (
              <ul className="list-disc pl-5 text-bad" data-testid="ds-import-rejected">
                {report.rejected.map((x) => <li key={x.index}>#{x.index + 1}{x.id ? ` (${x.id})` : ""}: {x.reason}</li>)}
              </ul>
            )}
            {report.renamed.length > 0 && <p className="text-xs text-muted" data-testid="ds-import-renamed">{report.renamed.map((x) => `${x.from} → ${x.to}`).join(", ")}</p>}
            {report.differing.length > 0 && <p className="text-xs text-muted" data-testid="ds-import-differing">{t("Tín hiệu hoặc kết quả phân loại do tệp khai báo khác với kết quả tính lại (đã dùng giá trị tính lại)", "Signals or classifier readings the file claimed differed from the recomputation (the recomputed values are used)")}: {report.differing.map((x) => `${x.id} ${x.what}`).join(", ")}</p>}
            {report.warnings.map((w) => <p key={w} className="text-xs text-muted">{w}</p>)}
          </div>
        )}
      </section>
    </main>
  );
}
