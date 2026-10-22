"use client";

import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { CheckboxFeatures } from "@captchalab/captcha-plugins";
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
  const f = featureSet.features;
  const selection = useEventSelection(session);
  const activation = useMemo(() => checkboxActivationMetrics(f), [f]);
  const sessionMetrics = useMemo(() => checkboxSessionMetrics(f), [f]);

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        Inspect
      </h2>

      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="replay-h" title="Replay">
          <CheckboxReplay session={session} size={size} />
        </Card>

        <Card id="metrics-h" title="Metrics">
          <div className="space-y-4">
            <MetricTable
              heading="Activation"
              metrics={activation}
              {...(f.activationCount === 0
                ? { notice: "No completed press was recorded, so activation timings are not available." }
                : {})}
            />
            <MetricTable heading="Session" metrics={sessionMetrics} />
            <p className="text-xs text-muted">
              Feature set <span className="font-mono">{featureSet.schemaVersion}</span> · extractor{" "}
              <span className="font-mono">{featureSet.extractorVersion}</span>. These are descriptive measurements of
              this one interaction, not evidence that it was made by a person or by software. Data stays in this
              browser tab.
            </p>
          </div>
        </Card>
      </div>

      <Card id="events-h" title="Event timeline">
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          There is no trajectory or velocity/acceleration chart for this CAPTCHA: a press has no meaningful path to
          plot. The slider uses them because dragging does.
        </p>
      </Card>
    </section>
  );
}
