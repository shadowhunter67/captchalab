"use client";

import { useT } from "@/lib/i18n";
import { CLASSIFIER_DISCLAIMER, CLASSIFIER_VERSION, LABEL_TEXT, STRENGTH_TEXT, TENDENCY_TEXT, type Classification, type ClassificationLabel, type Tendency } from "@/lib/behavior/classifier";
import { formatSignal, signalLabel } from "@/lib/behavior/signal-catalog";

/** Neutral shapes, not colours or ticks: nothing here should read as "correct" or "wrong". */
const LABEL_GLYPH: Record<ClassificationLabel, string> = { "human-like": "◯", "synthetic-like": "◆", uncertain: "◇" };
const TENDENCY_GLYPH: Record<Tendency, string> = { "human-like": "◯", "synthetic-like": "◆", neutral: "–" };

export function ClassifierDisclaimer({ testId = "classifier-disclaimer" }: { testId?: string }) {
  const t = useT();
  return (
    <p className="text-xs text-muted" data-testid={testId}>
      {t(CLASSIFIER_DISCLAIMER[1], CLASSIFIER_DISCLAIMER[0])}
    </p>
  );
}

function Balance({ balance }: { balance: number | null }) {
  const t = useT();
  if (balance === null) return null;
  const pos = ((balance + 1) / 2) * 100;
  return (
    <div data-testid="balance">
      <div className="flex justify-between text-xs text-muted" aria-hidden="true">
        <span>◯ {t("giống người", "human-like")}</span>
        <span>{t("giống mô phỏng", "synthetic-like")} ◆</span>
      </div>
      <div className="relative my-1 h-2 rounded-full bg-track" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-2 w-px bg-line" />
        <div className="absolute top-[-3px] h-3.5 w-1.5 -translate-x-1/2 rounded-sm bg-fg" style={{ left: `${pos}%` }} />
      </div>
      <p className="text-xs text-muted">
        {t("Cán cân bằng chứng", "Balance of evidence")}: <span className="font-mono" data-testid="balance-value">{balance > 0 ? "+" : balance < 0 ? "−" : "±"}{Math.abs(balance).toFixed(2)}</span>{" "}
        {t("(thang −1 đến +1; không phải xác suất hay độ tin cậy)", "(scale −1 to +1; not a probability or a confidence)")}
      </p>
    </div>
  );
}

/**
 * Label, evidence and balance of ONE classification. The label is words plus a neutral shape; the evidence says
 * why, in text. There is no percentage and no "bot" wording anywhere.
 */
export function ClassificationCard({ title, classification, testId }: { title: string; classification: Classification | null; testId: string }) {
  const t = useT();
  return (
    <section aria-label={title} className="min-w-0 space-y-3 rounded-lg border border-line bg-panel p-4" data-testid={testId}>
      <h4 className="text-sm font-semibold">{title}</h4>
      {classification === null ? (
        <p className="text-sm text-muted" data-testid={`${testId}-empty`}>
          {t("Chưa có mẫu để phân loại.", "No sample to classify yet.")}
        </p>
      ) : (
        <>
          <p className="text-lg font-semibold" data-testid={`${testId}-label`} data-label={classification.label}>
            <span aria-hidden="true">{LABEL_GLYPH[classification.label]} </span>
            {t(LABEL_TEXT[classification.label][1], LABEL_TEXT[classification.label][0])}
          </p>
          {classification.reason === "insufficient-data" && (
            <p className="text-sm text-muted">{t("Quá ít tín hiệu đo được để đưa ra nghiêng về phía nào.", "Too few signals could be measured to lean either way.")}</p>
          )}
          <Balance balance={classification.balance} />
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("Bằng chứng", "Evidence")}</h5>
            {classification.evidence.length === 0 ? (
              <p className="text-sm text-muted">{t("Không có tín hiệu nào đọc được.", "No readable signals.")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm" data-testid={`${testId}-evidence`}>
                {classification.evidence.map((e) => (
                  <li key={e.signal} data-signal={e.signal} data-tendency={e.tendency}>
                    <span aria-hidden="true" className="mr-1 inline-block w-4 text-center">{TENDENCY_GLYPH[e.tendency]}</span>
                    <span className="font-medium">{signalLabel(e.signal, t)}</span>
                    {": "}
                    <span className="font-mono">{formatSignal(e.signal, e.value)}</span>
                    {" — "}
                    <span>
                      {t(TENDENCY_TEXT[e.tendency][1], TENDENCY_TEXT[e.tendency][0])}
                      {e.tendency !== "neutral" && ` (${t(STRENGTH_TEXT[e.strength][1], STRENGTH_TEXT[e.strength][0])})`}
                    </span>
                    <span className="block pl-5 text-xs text-muted">
                      {t(e.explanationVi, e.explanation)} · {t("tín hiệu chuẩn hoá thử nghiệm", "experimental normalized signal")} {e.normalized.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted" data-testid={`${testId}-version`}>
            {t("Bộ phân loại", "Classifier")}: <span className="font-mono">{CLASSIFIER_VERSION}</span>
          </p>
        </>
      )}
    </section>
  );
}
