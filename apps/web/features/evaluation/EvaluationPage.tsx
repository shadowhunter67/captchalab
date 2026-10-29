"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/inspect/Card";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { CLASSIFIER_VERSION, LABEL_TEXT } from "@/lib/behavior/classifier";
import { signalRows } from "@/lib/behavior/compare";
import { catalogFor } from "@/lib/catalog";
import { importDataset } from "@/lib/dataset/format";
import { analyzeRecord, type RecordAnalysis } from "@/lib/dataset/records";
import { datasetStore, useDataset } from "@/lib/dataset/store";
import { DEFAULT_THRESHOLDS, MIN_GROUP_SAMPLE, errorKind, evaluate, evaluateBy, withThresholds, type ErrorKind, type Evaluation, type GroupEvaluation } from "@/lib/evaluation/evaluate";
import { toEvalInputs } from "@/lib/evaluation/inputs";
import { useT } from "@/lib/i18n";
import { describeError, readFileText } from "@/lib/research/browser";

const btn = "rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium hover:bg-track disabled:opacity-50";

const pct = (v: number | null): string => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null): string => (v === null ? "—" : v.toFixed(3));

type Filter = "all" | ErrorKind;

/**
 * Evaluation of the current classifier against the labels a person gave. It reads the in-memory dataset and changes
 * nothing in it. The Threshold Sandbox re-reads the SAME balances at other thresholds; the baseline classifier is
 * never touched, and the sandbox values are local state that is lost on reload.
 */
export function EvaluationPage() {
  const t = useT();
  const { records } = useDataset();
  const names = useMemo(() => new Map(catalogFor(t).map((c) => [c.id, c.name])), [t]);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewId, setViewId] = useState<string | null>(null);
  const [humanT, setHumanT] = useState<number>(DEFAULT_THRESHOLDS.human);
  const [synthT, setSynthT] = useState<number>(DEFAULT_THRESHOLDS.synthetic);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const inputs = useMemo(() => toEvalInputs(records, analyses), [records, analyses]);
  const base = useMemo(() => evaluate(inputs), [inputs]);
  const byCaptcha = useMemo(() => evaluateBy(inputs, (r) => r.captcha), [inputs]);
  const byDifficulty = useMemo(() => evaluateBy(inputs, (r) => r.difficulty), [inputs]);
  const sandboxInputs = useMemo(() => withThresholds(inputs, { human: humanT, synthetic: synthT }), [inputs, humanT, synthT]);
  const sandbox = useMemo(() => evaluate(sandboxInputs), [sandboxInputs]);
  const sandboxChanged = humanT !== DEFAULT_THRESHOLDS.human || synthT !== DEFAULT_THRESHOLDS.synthetic;

  const errors = useMemo(() => inputs.map((r) => ({ r, kind: errorKind(r) })).filter((x): x is { r: (typeof inputs)[number]; kind: ErrorKind } => x.kind !== null), [inputs]);
  const shown = filter === "all" ? errors : errors.filter((x) => x.kind === filter);
  const viewed = records.find((r) => r.id === viewId) ?? null;
  const viewedAnalysis = viewed ? analyses.get(viewed.id) : undefined;

  const KIND_TEXT: Record<ErrorKind, string> = {
    "human-as-synthetic": t("Người → Giống mô phỏng", "Human → Synthetic-like"),
    "synthetic-as-human": t("Mô phỏng → Giống người", "Synthetic → Human-like"),
    "human-uncertain": t("Người → Chưa rõ", "Human → Uncertain"),
    "synthetic-uncertain": t("Mô phỏng → Chưa rõ", "Synthetic → Uncertain"),
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const result = importDataset(await readFileText(file), datasetStore.get().records);
      datasetStore.replaceAll(result.records, datasetStore.get().dirty || result.imported > 0);
      setNotice(`${result.imported} ${t("đã nhập", "imported")}, ${result.rejected.length} ${t("bị từ chối", "rejected")}`);
    } catch (err) {
      setNotice(describeError(err, t));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const MatrixCell = ({ id, n }: { id: string; n: number }) => (
    <td className="py-1 pr-3 font-mono" data-testid={id}>{n}</td>
  );

  const MetricList = ({ e, prefix }: { e: Evaluation; prefix: string }) => (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      <dt title={t("(Giống người + Giống mô phỏng) / số phiên đủ điều kiện", "(Human-like + Synthetic-like) / eligible records")}>{t("Độ phủ quyết định", "Decision coverage")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-coverage`}>{pct(e.metrics.coverage)}</dd>
      <dt title={t("Chưa rõ / số phiên đủ điều kiện", "Uncertain / eligible records")}>{t("Tỉ lệ không quyết định", "Abstention rate")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-abstention`}>{pct(e.metrics.abstentionRate)}</dd>
      <dt title={t("Quyết định đúng / số phiên đã quyết định. Phiên “Chưa rõ” nằm ngoài mẫu số.", "Correct decisions / decided records. Uncertain records are outside the denominator.")}>{t("Độ chính xác trong các phiên đã quyết định", "Accuracy among decided samples")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-accuracy`}>{pct(e.metrics.decidedAccuracy)}</dd>
      <dt title={t("Quyết định đúng / số phiên đủ điều kiện. “Chưa rõ” không được tính là đúng.", "Correct decisions / eligible records. Uncertain does not count as correct.")}>{t("Tỉ lệ quyết định đúng trên tất cả", "Overall correct-decision rate")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-overall`}>{pct(e.metrics.overallCorrectRate)}</dd>
      <dt>{t("Precision (lớp dương: Mô phỏng)", "Precision (positive class: Synthetic)")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-precision`}>{num(e.metrics.precision)}</dd>
      <dt>{t("Recall (lớp dương: Mô phỏng)", "Recall (positive class: Synthetic)")}</dt>
      <dd className="font-mono" data-testid={`${prefix}-recall`}>{num(e.metrics.recall)}</dd>
      <dt>F1</dt>
      <dd className="font-mono" data-testid={`${prefix}-f1`}>{num(e.metrics.f1)}</dd>
    </dl>
  );

  const GroupTable = ({ title, groups, id, label }: { title: string; groups: GroupEvaluation[]; id: string; label: (k: string) => string }) => (
    <Card id={`${id}-h`} title={title}>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid={id}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-1 pr-3 font-medium">{t("Nhóm", "Group")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Đủ điều kiện", "Eligible")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Độ phủ", "Coverage")}</th>
                <th scope="col" className="py-1 pr-3 font-medium">{t("Chính xác (đã quyết định)", "Decided accuracy")}</th>
                <th scope="col" className="py-1 font-medium">{t("Chưa rõ", "Uncertain")}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.key} className="border-b border-line/50" data-testid={`${id}-${g.key}`}>
                  <th scope="row" className="py-1 pr-3 font-normal">{label(g.key)}</th>
                  <td className="py-1 pr-3 font-mono">{g.evaluation.eligible}</td>
                  {g.insufficient ? (
                    <td colSpan={3} className="py-1 text-muted" data-testid={`${id}-${g.key}-insufficient`}>
                      {t(`Chưa đủ mẫu (cần ít nhất ${MIN_GROUP_SAMPLE})`, `Insufficient sample (at least ${MIN_GROUP_SAMPLE} needed)`)}
                    </td>
                  ) : (
                    <>
                      <td className="py-1 pr-3 font-mono">{pct(g.evaluation.metrics.coverage)}</td>
                      <td className="py-1 pr-3 font-mono">{pct(g.evaluation.metrics.decidedAccuracy)}</td>
                      <td className="py-1 font-mono">{g.evaluation.humanUncertain + g.evaluation.syntheticUncertain}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link prefetch={false} href="/experiments" className="text-sm text-muted underline">{t("Thí nghiệm", "Experiments")}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Đánh giá bộ phân loại", "Classifier evaluation")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "So sánh kết quả của bộ phân loại với nhãn do người dùng đặt trong bộ dữ liệu. Chỉ đọc: trang này không sửa luật, nhãn hay bộ dữ liệu.",
            "Compare the classifier's reading with the labels a person set in the dataset. Read-only: this page changes no rule, label or record.",
          )}
        </p>
        <p className="mt-1 text-xs text-muted" data-testid="eval-classifier">{t("Bộ phân loại", "Classifier")}: <span className="font-mono">{CLASSIFIER_VERSION}</span></p>
      </header>
      <ResearchDisclaimer />
      <div className="space-y-1 rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid="eval-notes">
        <p>{t("Nhãn là nhãn do người dùng đặt, không phải sự thật đã được xác minh. Số liệu chỉ mô tả bộ dữ liệu nhỏ này, không phải tỉ lệ sai/đúng của một hệ thống bảo mật.", "Labels are user-provided, not verified ground truth. The numbers describe this small dataset only; they are not the error rates of a security system.")}</p>
        <p>{t("“Chưa rõ” không được tính là đúng hay sai: nó được đếm riêng.", "Uncertain is neither right nor wrong: it is counted on its own.")}</p>
      </div>

      {notice && <p role="status" className="text-sm text-muted" data-testid="eval-notice">{notice}</p>}

      {base.eligible === 0 ? (
        <section className="space-y-2 rounded-lg border border-line bg-panel p-4" data-testid="eval-empty">
          <p className="text-sm">{t("Chưa có phiên có nhãn nào để đánh giá.", "No eligible labeled sessions.")}</p>
          <p className="text-xs text-muted" data-testid="eval-empty-unknown">{t(`Phiên “Chưa rõ” bị loại: ${base.excludedUnknown}.`, `Excluded unknown records: ${base.excludedUnknown}.`)}</p>
          <p className="flex flex-wrap gap-4 text-sm">
            <Link prefetch={false} href="/experiments/dataset" className="underline">{t("Mở bộ dữ liệu có nhãn", "Open the labeled dataset")}</Link>
          </p>
        </section>
      ) : (
        <>
          <section aria-labelledby="eval-sum-h" className="space-y-4" data-testid="eval-summary">
            <h2 id="eval-sum-h" className="text-base font-semibold">{t("Phiên đủ điều kiện", "Eligibility")}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card id="eval-elig-h" title={t("Đủ điều kiện (Người hoặc Mô phỏng)", "Eligible (Human or Synthetic)")}>
                <p className="text-2xl font-semibold" data-testid="eval-eligible">{base.eligible}</p>
              </Card>
              <Card id="eval-excl-h" title={t("Bị loại: Chưa rõ", "Excluded: Unknown")}>
                <p className="text-2xl font-semibold" data-testid="eval-excluded">{base.excludedUnknown}</p>
                <p className="text-xs text-muted">{t("Phiên không có nhãn không tham gia đánh giá.", "Records without a label do not take part.")}</p>
              </Card>
              <Card id="eval-dec-h" title={t("Đã quyết định", "Decided")}>
                <p className="text-2xl font-semibold" data-testid="eval-decided">{base.decided}</p>
                <p className="text-xs text-muted">{t("Giống người + Giống mô phỏng", "Human-like + Synthetic-like")}</p>
              </Card>
            </div>
          </section>

          <section aria-labelledby="eval-mat-h" className="space-y-3 rounded-lg border border-line bg-panel p-4">
            <h2 id="eval-mat-h" className="text-base font-semibold">{t("Bảng kết quả", "Outcome table")}</h2>
            <p className="text-xs text-muted">{t("Hàng: nhãn do người dùng đặt. Cột: kết quả của bộ phân loại.", "Rows: the label a person set. Columns: what the classifier said.")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="eval-matrix">
                <caption className="sr-only">{t("Nhãn so với kết quả bộ phân loại", "Label versus classifier output")}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Nhãn \\ Kết quả", "Label \\ Output")}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t(LABEL_TEXT["human-like"][1], LABEL_TEXT["human-like"][0])}</th>
                    <th scope="col" className="py-1 pr-3 font-medium">{t(LABEL_TEXT["synthetic-like"][1], LABEL_TEXT["synthetic-like"][0])}</th>
                    <th scope="col" className="py-1 font-medium">{t(LABEL_TEXT.uncertain[1], LABEL_TEXT.uncertain[0])}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line/50">
                    <th scope="row" className="py-1 pr-3 font-normal">{t("Người", "Human")}</th>
                    <MatrixCell id="eval-hh" n={base.matrix.human.humanLike} />
                    <MatrixCell id="eval-hs" n={base.matrix.human.syntheticLike} />
                    <MatrixCell id="eval-hu" n={base.matrix.human.uncertain} />
                  </tr>
                  <tr>
                    <th scope="row" className="py-1 pr-3 font-normal">{t("Mô phỏng", "Synthetic")}</th>
                    <MatrixCell id="eval-sh" n={base.matrix.synthetic.humanLike} />
                    <MatrixCell id="eval-ss" n={base.matrix.synthetic.syntheticLike} />
                    <MatrixCell id="eval-su" n={base.matrix.synthetic.uncertain} />
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="space-y-1 text-sm" data-testid="eval-errors-summary">
              <li>{t("Người bị đọc là Giống mô phỏng", "Human labeled as Synthetic-like")}: <span className="font-mono" data-testid="eval-human-as-synthetic">{base.humanAsSynthetic}</span> <span className="text-xs text-muted" title={t("tương tự “từ chối nhầm”", "false rejection-like")}>({t("tương tự từ chối nhầm", "false rejection-like")})</span></li>
              <li>{t("Mô phỏng bị đọc là Giống người", "Synthetic labeled as Human-like")}: <span className="font-mono" data-testid="eval-synthetic-as-human">{base.syntheticAsHuman}</span> <span className="text-xs text-muted" title={t("tương tự “chấp nhận nhầm”", "false acceptance-like")}>({t("tương tự chấp nhận nhầm", "false acceptance-like")})</span></li>
              <li>{t("Người → Chưa rõ", "Human → Uncertain")}: <span className="font-mono" data-testid="eval-human-uncertain">{base.humanUncertain}</span></li>
              <li>{t("Mô phỏng → Chưa rõ", "Synthetic → Uncertain")}: <span className="font-mono" data-testid="eval-synthetic-uncertain">{base.syntheticUncertain}</span></li>
            </ul>
          </section>

          <section aria-labelledby="eval-met-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="eval-metrics">
            <h2 id="eval-met-h" className="text-base font-semibold">{t("Chỉ số", "Metrics")}</h2>
            <MetricList e={base} prefix="eval" />
            <p className="text-xs text-muted">{t("Precision, recall và F1 chỉ tính trên các phiên đã quyết định; xem độ phủ bên cạnh.", "Precision, recall and F1 are computed on decided samples only; read them next to the coverage.")}</p>
          </section>

          <GroupTable title={t("Theo CAPTCHA", "By CAPTCHA")} groups={byCaptcha} id="eval-by-captcha" label={(k) => names.get(k as never) ?? k} />
          <GroupTable title={t("Theo độ khó", "By difficulty")} groups={byDifficulty} id="eval-by-difficulty" label={(k) => k} />

          <section aria-labelledby="eval-err-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="eval-explorer">
            <h2 id="eval-err-h" className="text-base font-semibold">{t("Các phiên bị phân loại lệch", "Misclassified sessions")}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="eval-filter">{t("Lọc", "Filter")}</label>
              <select id="eval-filter" data-testid="eval-filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="rounded-md border border-line bg-bg px-2 py-1">
                <option value="all">{t("Tất cả", "All")} ({errors.length})</option>
                {(Object.keys(KIND_TEXT) as ErrorKind[]).map((k) => <option key={k} value={k}>{KIND_TEXT[k]} ({errors.filter((x) => x.kind === k).length})</option>)}
              </select>
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-muted" data-testid="eval-no-errors">{t("Không có phiên nào ở mục này.", "No sessions in this group.")}</p>
            ) : (
              <ul className="space-y-1 text-sm" data-testid="eval-error-list">
                {shown.map(({ r, kind }) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3" data-testid={`eval-err-${r.id}`}>
                    <span className="font-mono">{r.id}</span>
                    <span>{names.get(r.captcha as never) ?? r.captcha} · {r.variant} · {r.difficulty}</span>
                    <span className="text-muted">{KIND_TEXT[kind]}</span>
                    <button type="button" data-testid={`eval-view-${r.id}`} aria-pressed={viewId === r.id} className={btn} onClick={() => setViewId(viewId === r.id ? null : r.id)}>{t("Xem", "View")}<span className="sr-only"> {r.id}</span></button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {viewed && viewedAnalysis && (
            <section aria-labelledby="eval-det-h" className="space-y-4" data-testid="eval-detail">
              <h2 id="eval-det-h" className="text-base font-semibold">{t("Chi tiết phiên", "Session detail")} {viewed.id}</h2>
              <Card id="eval-det-meta-h" title={t("Nhãn và nguồn", "Label and source")}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">CAPTCHA</dt>
                  <dd>{names.get(viewed.definition.captcha) ?? viewed.definition.captcha} · {viewed.definition.variant} · {viewed.definition.difficulty}</dd>
                  <dt className="text-muted">{t("Nguồn", "Source")}</dt>
                  <dd>{viewed.source.type === "synthetic" ? t("Mô phỏng", "Synthetic") : t("Đã ghi", "Recorded")}{viewed.source.imported ? ` · ${t("nhập từ tệp", "imported")}` : ""}</dd>
                  <dt className="text-muted">{t("Nhãn do người dùng đặt", "User-provided label")}</dt>
                  <dd data-testid="eval-detail-label">{viewed.label === "human" ? t("Người", "Human") : viewed.label === "synthetic" ? t("Mô phỏng", "Synthetic") : t("Chưa rõ", "Unknown")}</dd>
                </dl>
              </Card>
              <ClassifierDisclaimer />
              <ClassificationCard title={t("Kết quả và bằng chứng của bộ phân loại", "Classifier result and evidence")} classification={viewedAnalysis.classification} testId="eval-class" />
              <Card id="eval-det-sig-h" title={t("Tín hiệu hành vi", "Behavioral signals")}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" data-testid="eval-signals">
                    <caption className="sr-only">{t("Tín hiệu của phiên", "Signals of the session")}</caption>
                    <tbody>
                      {signalRows(viewedAnalysis.vector, null, viewed.definition.captcha, t).map((row) => (
                        <tr key={row.id} className="border-b border-line/50">
                          <th scope="row" className="py-1 pr-3 font-normal" title={row.description}>{row.label}</th>
                          <td className="py-1 font-mono">{row.human}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          <section aria-labelledby="eval-sb-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="eval-sandbox">
            <h2 id="eval-sb-h" className="text-base font-semibold">{t("Sandbox ngưỡng", "Threshold Sandbox")}</h2>
            <p className="text-xs text-muted" role="note" data-testid="eval-overfit">
              {t("Đổi ngưỡng trên chính bộ dữ liệu đang dùng để đánh giá có thể làm kết quả bị khớp quá mức (overfit).", "Changing thresholds on the same dataset used for evaluation can overfit the results.")}
            </p>
            <p className="text-xs text-muted">{t(`Đây là thử nghiệm cục bộ: ${CLASSIFIER_VERSION} không bị thay đổi và giá trị này không được lưu. Cán cân ≤ −ngưỡng người thì Giống người; ≥ +ngưỡng mô phỏng thì Giống mô phỏng.`, `A local experiment: ${CLASSIFIER_VERSION} is not changed and these values are not saved. A balance ≤ −human threshold reads Human-like; ≥ +synthetic threshold reads Synthetic-like.`)}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                {t("Ngưỡng Giống người", "Human-like threshold")}: <span className="font-mono" data-testid="eval-human-t-value">{humanT.toFixed(2)}</span>
                <input type="range" min={0} max={1} step={0.05} value={humanT} data-testid="eval-human-t" onChange={(e) => setHumanT(Number(e.target.value))} className="mt-1 block w-full" />
              </label>
              <label className="block text-sm">
                {t("Ngưỡng Giống mô phỏng", "Synthetic-like threshold")}: <span className="font-mono" data-testid="eval-synth-t-value">{synthT.toFixed(2)}</span>
                <input type="range" min={0} max={1} step={0.05} value={synthT} data-testid="eval-synth-t" onChange={(e) => setSynthT(Number(e.target.value))} className="mt-1 block w-full" />
              </label>
            </div>
            <button type="button" data-testid="eval-reset-t" className={btn} disabled={!sandboxChanged} onClick={() => { setHumanT(DEFAULT_THRESHOLDS.human); setSynthT(DEFAULT_THRESHOLDS.synthetic); }}>
              {t(`Đặt lại về ${DEFAULT_THRESHOLDS.human.toFixed(2)}`, `Reset to ${DEFAULT_THRESHOLDS.human.toFixed(2)}`)}
            </button>
            <MetricList e={sandbox} prefix="eval-sb" />
            <p className="text-xs text-muted" data-testid="eval-sb-compare">
              {t("Cơ sở", "Baseline")} ({CLASSIFIER_VERSION}): {t("độ phủ", "coverage")} {pct(base.metrics.coverage)} · {t("chính xác (đã quyết định)", "decided accuracy")} {pct(base.metrics.decidedAccuracy)}
            </p>
          </section>
        </>
      )}

      <section aria-labelledby="eval-io-h" className="space-y-2 rounded-lg border border-line bg-panel p-4">
        <h2 id="eval-io-h" className="text-base font-semibold">{t("Nguồn dữ liệu", "Data source")}</h2>
        <p className="text-sm text-muted">
          {t("Đánh giá dùng bộ dữ liệu đang có trong thẻ này. ", "Evaluation uses the dataset currently in this tab. ")}
          <Link prefetch={false} href="/experiments/dataset" className="underline">{t("Mở bộ dữ liệu", "Open the dataset")}</Link>
        </p>
        <label htmlFor="eval-import-file" className="block text-sm text-muted">{t("Hoặc nhập một tệp captchalab-labeled-dataset@1 (được nối vào bộ dữ liệu hiện tại, coi là không đáng tin).", "Or import a captchalab-labeled-dataset@1 file (appended to the current dataset, treated as untrusted).")}</label>
        <input id="eval-import-file" ref={fileRef} type="file" accept="application/json,.json" data-testid="eval-import-file" onChange={(e) => void onFile(e.target.files?.[0])} className="block text-sm" />
      </section>
    </main>
  );
}
