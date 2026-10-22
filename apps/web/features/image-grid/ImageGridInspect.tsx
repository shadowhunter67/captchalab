"use client";

import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { ImageGridFeatures } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { imageGridMetrics } from "./image-grid-view-data";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<ImageGridFeatures>;
  session: InteractionSession;
}

/** Image Grid Inspect: result, metrics, timeline and inspector. No chart or replay: a selection has no path. */
export function ImageGridInspect({ verification, featureSet, session }: Props) {
  const selection = useEventSelection(session);
  const metrics = useMemo(() => imageGridMetrics(featureSet.features), [featureSet]);
  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        Inspect
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <Card id="metrics-h" title="Metrics">
        <div className="space-y-4">
          <MetricTable heading="Selection" metrics={metrics} />
          <p className="text-xs text-muted">
            Feature set <span className="font-mono">{featureSet.schemaVersion}</span> · extractor{" "}
            <span className="font-mono">{featureSet.extractorVersion}</span>. Descriptive measurements of this one
            interaction, not evidence that it was made by a person or by software. Data stays in this browser tab.
          </p>
        </div>
      </Card>
      <Card id="events-h" title="Event timeline">
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">No trajectory, chart or replay for this CAPTCHA: selecting images has no path to draw.</p>
      </Card>
    </section>
  );
}
