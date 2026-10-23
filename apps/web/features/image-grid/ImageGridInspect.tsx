"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { ImageGridFeatures } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useT } from "@/lib/i18n";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { imageGridMetrics } from "./image-grid-view-data";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<ImageGridFeatures>;
  session: InteractionSession;
}

/** Image Grid Inspect: result, metrics, timeline and inspector. No chart or replay: a selection has no path. */
export function ImageGridInspect({ verification, featureSet, session }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  const metrics = useMemo(() => imageGridMetrics(featureSet.features, t), [featureSet, t]);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <Card id="metrics-h" title={t("Chỉ số", "Metrics")}>
        <div className="space-y-4">
          <MetricTable heading={t("Lựa chọn", "Selection")} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
            {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
            {t(
              "Đây chỉ là số đo mô tả một lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
              "Descriptive measurements of this one interaction, not evidence that it was made by a person or by software. Data stays in this browser tab.",
            )}
          </p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có đường đi, biểu đồ hay phát lại: việc chọn ảnh không có đường nào để vẽ.",
            "No trajectory, chart or replay for this CAPTCHA: selecting images has no path to draw.",
          )}
        </p>
      </Card>
    </section>
  );
}
