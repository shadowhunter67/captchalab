"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { SequenceFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { sequenceMetrics } from "./sequence-view-data";

interface Props {
  kind: "number" | "visual";
  verification: VerificationResult;
  featureSet: FeatureSet<SequenceFeatures>;
  session: InteractionSession;
}

/** Sequence Inspect: result, metrics, timeline and inspector. No trajectory, chart or replay. */
export function SequenceInspect({ kind, verification, featureSet, session }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  const metrics = useMemo(() => sequenceMetrics(featureSet.features, kind, t), [featureSet, kind, t]);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />
      <Card id="metrics-h" title={t("Chỉ số", "Metrics")}>
        <div className="space-y-4">
          <MetricTable heading={kind === "number" ? t("Gõ phím", "Typing") : t("Lựa chọn", "Selection")} metrics={metrics} />
          <p className="text-xs text-muted">{t("Các chỉ số không áp dụng cho biến thể này không được hiển thị.", "Measures that do not apply to this variant are not shown.")}</p>
          <p className="text-xs text-muted">
            {t("Bộ chỉ số", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
            {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
            {t(
              "Đây chỉ là số đo mô tả một lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Với dãy số, bản ghi chỉ lưu loại phím (Letter, Digit, Backspace…), không bao giờ lưu bạn đã nhấn số nào. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
              "Descriptive measurements of this one interaction, not evidence that it was made by a person or by software. For number sequences the recording stores key classes (Letter, Digit, Backspace…), never which digit you pressed. Data stays in this browser tab.",
            )}
          </p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có đường đi, biểu đồ hay phát lại: gõ số hay chọn một lựa chọn không có đường nào để vẽ.",
            "No trajectory, chart or replay for this CAPTCHA: typing a number or choosing an option has no path to draw.",
          )}
        </p>
      </Card>
    </section>
  );
}
