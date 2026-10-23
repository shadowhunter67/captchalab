"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { CheckboxFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { CheckboxReplay } from "./CheckboxReplay";
import type { ControlSize } from "./CheckboxSurface";
import { checkboxActivationMetrics, checkboxSessionMetrics } from "./checkbox-view-data";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<CheckboxFeatures>;
  session: InteractionSession;
  size: ControlSize;
}

/**
 * Checkbox Inspect, composed from the same generic primitives as the Slider's: verification summary,
 * metric table, event timeline, event inspector, replay controls. It deliberately has no trajectory and
 * no velocity/acceleration charts: a single press has no path worth plotting.
 */
export function CheckboxInspect({ verification, featureSet, session, size }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const f = featureSet.features;
  const selection = useEventSelection(session);
  const activation = useMemo(() => checkboxActivationMetrics(f, t), [f, t]);
  const sessionMetrics = useMemo(() => checkboxSessionMetrics(f, t), [f, t]);

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>

      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="replay-h" title={t("Phát lại", "Replay")}>
          <CheckboxReplay session={session} size={size} />
        </Card>

        <Card id="metrics-h" title={t("Chỉ số", "Metrics")}>
          <div className="space-y-4">
            <MetricTable
              heading={t("Kích hoạt", "Activation")}
              metrics={activation}
              {...(f.activationCount === 0
                ? {
                    notice: t(
                      "Không ghi được lần nhấn nào hoàn tất, nên chưa có thời gian kích hoạt.",
                      "No completed press was recorded, so activation timings are not available.",
                    ),
                  }
                : {})}
            />
            <MetricTable heading={t("Phiên", "Session")} metrics={sessionMetrics} />
            <p className="text-xs text-muted">
              {t("Bộ chỉ số", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
              {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
              {t(
                "Đây chỉ là các số đo mô tả lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
                "These are descriptive measurements of this one interaction, not evidence that it was made by a person or by software. Data stays in this browser tab.",
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có biểu đồ đường đi hay vận tốc/gia tốc: một lần nhấn không có đường đi nào đáng vẽ. Thanh trượt dùng các biểu đồ đó vì thao tác kéo có đường đi.",
            "There is no trajectory or velocity/acceleration chart for this CAPTCHA: a press has no meaningful path to plot. The slider uses them because dragging does.",
          )}
        </p>
      </Card>
    </section>
  );
}
