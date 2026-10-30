"use client";

import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { PowFeatures } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEmbedReport } from "@/lib/embed-report";
import { useT } from "@/lib/i18n";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { powMetrics } from "./pow-view-data";
import { useScopedId } from "@/lib/id-scope";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<PowFeatures>;
  session: InteractionSession;
}

/** Proof of Work Inspect: result, computation metrics and the few recorded button presses. No chart or replay. */
export function PowInspect({ verification, featureSet, session }: Props) {
  const sid = useScopedId();
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  const metrics = useMemo(() => powMetrics(featureSet.features, t), [featureSet, t]);
  return (
    <section aria-labelledby={sid("inspect-h")} className="space-y-4" data-testid="inspect">
      <h2 id={sid("inspect-h")} className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />
      <Card id="metrics-h" title={t("Chỉ số phép tính", "Computation metrics")}>
        <div className="space-y-4">
          <MetricTable heading={t("Phép tính", "Computation")} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
            {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.
          </p>
          <p className="text-xs text-muted" data-testid="pow-disclaimer">
            {t(
              "Bằng chứng công việc không chứng minh người dùng là con người. Nó chỉ cho thấy phía máy khách đã bỏ ra công sức tính toán, và máy nào cũng làm được.",
              "Proof of work does not prove the user is human. It only shows that the client spent computational effort, and any machine can do that.",
            )}
          </p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có đường đi, biểu đồ hay phát lại. Chỉ các lần bấm Bắt đầu và Huỷ được ghi lại; cố ý không ghi một sự kiện cho mỗi lần băm.",
            "No trajectory, chart or replay for this CAPTCHA. Only Start and Cancel presses are recorded; one event per hash is deliberately not recorded.",
          )}
        </p>
      </Card>
    </section>
  );
}
