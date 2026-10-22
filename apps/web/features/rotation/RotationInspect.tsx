"use client";

import { useMemo } from "react";
import type { FeatureSet, InteractionSession, Point, VerificationResult } from "@captchalab/captcha-core";
import { deriveRotation, type RotationChallenge, type RotationFeatures } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { MotionChart } from "@/components/inspect/MotionChart";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { RotationReplay } from "./RotationReplay";
import { angularVelocitySegments, dragDomain, rotationMetrics } from "./rotation-view-data";

interface Props {
  challenge: RotationChallenge;
  verification: VerificationResult;
  featureSet: FeatureSet<RotationFeatures>;
  session: InteractionSession;
  center: Point;
}

const axis = (v: number): string => String(Math.round(v));

export function RotationInspect({ challenge, verification, featureSet, session, center }: Props) {
  const f = featureSet.features;
  const selection = useEventSelection(session);
  const analysis = useMemo(() => deriveRotation(challenge, { center }, session), [challenge, center, session]);
  const segments = useMemo(() => angularVelocitySegments(analysis), [analysis]);
  const domain = useMemo(() => dragDomain(analysis), [analysis]);
  const metrics = useMemo(() => rotationMetrics(f), [f]);

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        Inspect
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="replay-h" title="Replay">
          <RotationReplay challenge={challenge} center={center} session={session} />
        </Card>
        <Card id="metrics-h" title="Metrics">
          <div className="space-y-4">
            <MetricTable heading="Rotation" metrics={metrics} />
            <p className="text-xs text-muted">
              Feature set <span className="font-mono">{featureSet.schemaVersion}</span> · extractor{" "}
              <span className="font-mono">{featureSet.extractorVersion}</span>. These are descriptive measurements of
              this one interaction, not evidence that it was made by a person or by software. Data stays in this
              browser tab.
            </p>
          </div>
        </Card>
      </div>
      <Card id="angvel-h" title="Angular velocity">
        <MotionChart
          title="Angular velocity"
          unit="°/s"
          segments={segments}
          xDomain={domain}
          includeZero
          selectedT={selection.event?.t ?? null}
          formatValue={axis}
          formatCell={(v) => `${v.toFixed(1)} °/s`}
          segmentLabel="Drag"
          testId="chart-angular-velocity"
          scopeNote="Pointer drags only (signed: positive is clockwise). Keyboard turns have no velocity."
        />
      </Card>
      <Card id="events-h" title="Event timeline">
        <EventExplorer session={session} selection={selection} />
      </Card>
    </section>
  );
}
