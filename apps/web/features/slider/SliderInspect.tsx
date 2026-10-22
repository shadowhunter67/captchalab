"use client";

import { useMemo, useState } from "react";
import { isPointerEvent, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import type { SliderChallenge, SliderFeatures, SliderLayout } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { EventInspector } from "@/components/inspect/EventInspector";
import { EventTimeline } from "@/components/inspect/EventTimeline";
import { MetricTable } from "@/components/inspect/MetricTable";
import { MotionChart } from "@/components/inspect/MotionChart";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { buildTimelineModel, stepSelection, timelineKind, type TimelineAnnotation } from "@/lib/inspect/events";
import { formatAcceleration, formatVelocity } from "@/lib/format";
import { interactionMetrics } from "@/lib/inspect/metrics";
import type { SessionMarker } from "@/lib/replay/markers";
import type { SubmitVia } from "./slider-controller";
import { SliderReplay } from "./SliderReplay";
import { sliderAttemptMetrics, sliderDragDomain, sliderMotionSeries } from "./slider-view-data";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<SliderFeatures>;
  session: InteractionSession;
  markers: readonly SessionMarker[];
  layout: SliderLayout;
  challenge: SliderChallenge;
  via: SubmitVia;
}

const axisNumber = (v: number): string => String(Math.round(v));

const CHART_SCOPE = "Handle drags only: hover is excluded and each attempt is a separate line.";

/**
 * Slider's Inspect page, composed from generic primitives. Slider-specific choices live in
 * slider-view-data.ts (which data to show); presentation lives in components/inspect.
 * `selectedIndex` (an index into session.events) is the single source of truth for selection:
 * the timeline, the event inspector, the trajectory marker and the chart crosshairs all derive from it.
 */
export function SliderInspect({ verification, featureSet, session, markers, layout, challenge, via }: Props) {
  const f = featureSet.features;
  const noDrag = f.numberOfAttempts === 0;
  // Selection is bound to the session snapshot it was made on: a different session starts unselected.
  const [selection, setSelection] = useState<{ session: InteractionSession; index: number } | null>(null);
  const selectedIndex = selection && selection.session === session ? selection.index : null;
  const setSelectedIndex = (next: number | null | ((i: number | null) => number | null)): void => {
    const value = typeof next === "function" ? next(selectedIndex) : next;
    setSelection(value === null ? null : { session, index: value });
  };

  const series = useMemo(() => sliderMotionSeries(session), [session]);
  const velocitySegments = useMemo(() => series.segments.map((s) => s.velocity), [series]);
  const accelerationSegments = useMemo(() => series.segments.map((s) => s.acceleration), [series]);
  const domain = useMemo(() => sliderDragDomain(session), [session]);
  const annotations = useMemo<TimelineAnnotation[]>(
    () => markers.map((m) => ({ t: m.t, label: "try again" })),
    [markers],
  );
  const timeline = useMemo(() => buildTimelineModel(session, 48, annotations.map((a) => a.t)), [session, annotations]);
  const attemptMetrics = useMemo(() => sliderAttemptMetrics(f), [f]);
  const sessionMetrics = useMemo(() => interactionMetrics(f), [f]);
  const selectedEvent = selectedIndex === null ? null : (session.events[selectedIndex] ?? null);
  const selectedT = selectedEvent?.t ?? null;
  const selectedPoint = selectedEvent && isPointerEvent(selectedEvent) ? { x: selectedEvent.x, y: selectedEvent.y } : null;
  const total = session.events.length;

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        Inspect
      </h2>

      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="traj-h" title="Trajectory and replay">
          <SliderReplay
            session={session}
            markers={markers}
            layout={layout}
            challenge={challenge}
            selectedPoint={selectedPoint}
          />
        </Card>

        <Card id="metrics-h" title="Metrics">
          <div className="space-y-4">
            <MetricTable
              heading="Slider attempt (final completed drag)"
              metrics={attemptMetrics}
              {...(via === "keyboard" && !noDrag
                ? { notice: "This submission used the keyboard. The drag metrics come from an earlier pointer attempt in this session." }
                : noDrag
                  ? { notice: "No pointer drag was recorded (keyboard interaction), so drag metrics are not available." }
                  : {})}
            />
            <MetricTable heading="Whole session (pointer motion)" metrics={sessionMetrics} />
            <p className="text-xs text-muted">
              Feature set <span className="font-mono">{featureSet.schemaVersion}</span> · extractor{" "}
              <span className="font-mono">{featureSet.extractorVersion}</span> · input: {session.inputModality}. These
              are descriptive measurements of this one interaction, not evidence that it was made by a person or by
              software. Data stays in this browser tab.
            </p>
          </div>
        </Card>
      </div>

      <Card id="velocity-h" title="Velocity">
        <MotionChart
          title="Velocity"
          unit="px/s"
          segments={velocitySegments}
          xDomain={domain}
          includeZero
          selectedT={selectedT}
          formatValue={axisNumber}
          formatCell={(v) => formatVelocity(v, 1)}
          segmentLabel="Drag"
          testId="chart-velocity"
          scopeNote={CHART_SCOPE}
        />
      </Card>

      <Card id="accel-h" title="Acceleration">
        <MotionChart
          title="Acceleration"
          unit="px/s²"
          segments={accelerationSegments}
          xDomain={domain}
          includeZero
          selectedT={selectedT}
          formatValue={axisNumber}
          formatCell={(v) => formatAcceleration(v, 1)}
          segmentLabel="Drag"
          testId="chart-acceleration"
          scopeNote={`${CHART_SCOPE} Computed from the velocity samples (change in speed between consecutive segments).`}
        />
      </Card>

      <Card id="events-h" title="Event timeline">
        <EventTimeline
          model={timeline}
          annotations={annotations}
          selectedIsMove={selectedEvent !== null && timelineKind(selectedEvent) === "move"}
          selectedT={selectedT}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
        <div className="mt-3">
          <EventInspector
            event={selectedEvent}
            index={selectedIndex}
            total={total}
            onPrevious={() => setSelectedIndex((i) => stepSelection(i, -1, total))}
            onNext={() => setSelectedIndex((i) => stepSelection(i, 1, total))}
            onClear={() => setSelectedIndex(null)}
          />
        </div>
      </Card>
    </section>
  );
}
