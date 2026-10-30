"use client";

import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEmbedReport } from "@/lib/embed-report";
import { useT } from "@/lib/i18n";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import type { InspectMetric } from "@/lib/inspect/metrics";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<object>;
  session: InteractionSession;
  metrics: InspectMetric[];
  heading: string;
  /** What this computation does and does not show; always visible next to the numbers. */
  disclaimer: string;
  eventsNote: string;
  /** Heading of the metrics card. Computation by default; Environment capabilities for a capability check. */
  metricsTitle?: string;
}

/** Inspect for computation CAPTCHAs (Proof of Space): result, computation metrics and the few recorded presses. */
export function ComputationInspect({ verification, featureSet, session, metrics, heading, disclaimer, eventsNote, metricsTitle }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">{t("Phân tích", "Inspect")}</h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <ChallengeConfigSlot />
      <Card id="metrics-h" title={metricsTitle ?? t("Chỉ số phép tính", "Computation metrics")}>
        <div className="space-y-4">
          <MetricTable heading={heading} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> · {t("bộ trích xuất", "extractor")}{" "}
            <span className="font-mono">{featureSet.extractorVersion}</span>.
          </p>
          <p className="text-xs text-muted" data-testid="computation-disclaimer">{disclaimer}</p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">{eventsNote}</p>
      </Card>
    </section>
  );
}
