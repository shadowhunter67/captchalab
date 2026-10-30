"use client";

import { useEmbedReport } from "@/lib/embed-report";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useT } from "@/lib/i18n";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import type { InspectMetric } from "@/lib/inspect/metrics";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<object>;
  session: InteractionSession;
  metrics: InspectMetric[];
  heading: string;
}

/**
 * Inspect for pick-a-cell CAPTCHAs (MatchKey, Tile Game): result, metrics, timeline and inspector. It knows no
 * CAPTCHA: the page passes the metric list. No chart or replay, because choosing a cell has no path to draw.
 */
export function SelectionInspect({ verification, featureSet, session, metrics, heading }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <ChallengeConfigSlot />
      <Card id="metrics-h" title={t("Chỉ số hành vi", "Behavioral metrics")}>
        <div className="space-y-4">
          <MetricTable heading={heading} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> · {t("bộ trích xuất", "extractor")}{" "}
            <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
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
          {t("CAPTCHA này không có đường đi, biểu đồ hay phát lại: chọn một ô không có đường nào để vẽ.", "No trajectory, chart or replay for this CAPTCHA: choosing a cell has no path to draw.")}
        </p>
      </Card>
    </section>
  );
}
