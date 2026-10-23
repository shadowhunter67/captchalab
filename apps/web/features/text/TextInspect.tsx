"use client";

import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { TextFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { textMetrics } from "./text-view-data";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<TextFeatures>;
  session: InteractionSession;
}

/** Text Inspect: result, metrics, timeline and inspector. No trajectory, chart or replay: typing has no path. */
export function TextInspect({ verification, featureSet, session }: Props) {
  const t = useT();
  const selection = useEventSelection(session);
  const metrics = useMemo(() => textMetrics(featureSet.features, t), [featureSet, t]);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <Card id="metrics-h" title={t("Chỉ số", "Metrics")}>
        <div className="space-y-4">
          <MetricTable heading={t("Gõ phím", "Typing")} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ chỉ số", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
            {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
            {t(
              "Đây chỉ là các số đo mô tả lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Bản ghi chỉ lưu loại phím (Letter, Digit, Backspace…), không bao giờ lưu bạn đã nhấn chữ hay số nào. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
              "Descriptive measurements of this one interaction, not evidence that it was made by a person or by software. The recording stores key classes (Letter, Digit, Backspace…), never which letter or digit you pressed. Data stays in this browser tab.",
            )}
          </p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có đường đi, biểu đồ hay phát lại: gõ phím không có đường đi để vẽ.",
            "No trajectory, chart or replay for this CAPTCHA: typing has no path to draw.",
          )}
        </p>
      </Card>
    </section>
  );
}
