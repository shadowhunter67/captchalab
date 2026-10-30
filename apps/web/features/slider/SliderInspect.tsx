"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import { isPointerEvent, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import type { SliderChallenge, SliderFeatures, SliderLayout } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { MotionChart } from "@/components/inspect/MotionChart";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import type { TimelineAnnotation } from "@/lib/inspect/events";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { formatAcceleration, formatVelocity } from "@/lib/format";
import { interactionMetrics } from "@/lib/inspect/metrics";
import type { SessionMarker } from "@/lib/replay/markers";
import type { SubmitVia } from "./slider-controller";
import { SliderReplay } from "./SliderReplay";
import { sliderAttemptMetrics, sliderDragDomain, sliderMotionSeries } from "./slider-view-data";
import { useScopedId } from "@/lib/id-scope";

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


/**
 * Slider's Inspect page, composed from generic primitives. Slider-specific choices live in
 * slider-view-data.ts (which data to show); presentation lives in components/inspect.
 * `selection.index` (an index into session.events) is the single source of truth for selection:
 * the timeline, the event inspector, the trajectory marker and the chart crosshairs all derive from it.
 */
export function SliderInspect({ verification, featureSet, session, markers, layout, challenge, via }: Props) {
  const sid = useScopedId();
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const chartScope = t(
    "Chỉ tính các lần kéo tay nắm: không tính di chuột qua, và mỗi lần thử là một đường riêng.",
    "Handle drags only: hover is excluded and each attempt is a separate line.",
  );
  const f = featureSet.features;
  const noDrag = f.numberOfAttempts === 0;
  const selection = useEventSelection(session);

  const series = useMemo(() => sliderMotionSeries(session), [session]);
  const velocitySegments = useMemo(() => series.segments.map((s) => s.velocity), [series]);
  const accelerationSegments = useMemo(() => series.segments.map((s) => s.acceleration), [series]);
  const domain = useMemo(() => sliderDragDomain(session), [session]);
  const annotations = useMemo<TimelineAnnotation[]>(
    () => markers.map((m) => ({ t: m.t, label: t("thử lại", "try again") })),
    [markers, t],
  );
  const attemptMetrics = useMemo(() => sliderAttemptMetrics(f, t), [f, t]);
  const sessionMetrics = useMemo(() => interactionMetrics(f, t), [f, t]);
  const selectedEvent = selection.event;
  const selectedT = selectedEvent?.t ?? null;
  const selectedPoint = selectedEvent && isPointerEvent(selectedEvent) ? { x: selectedEvent.x, y: selectedEvent.y } : null;

  return (
    <section aria-labelledby={sid("inspect-h")} className="space-y-4" data-testid="inspect">
      <h2 id={sid("inspect-h")} className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>

      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="traj-h" title={t("Đường đi và phát lại", "Trajectory and replay")}>
          <SliderReplay
            session={session}
            markers={markers}
            layout={layout}
            challenge={challenge}
            selectedPoint={selectedPoint}
          />
        </Card>

        <Card id="metrics-h" title={t("Chỉ số hành vi", "Behavioral metrics")}>
          <div className="space-y-4">
            <MetricTable
              heading={t("Lần thử thanh trượt (lần kéo hoàn tất cuối cùng)", "Slider attempt (final completed drag)")}
              metrics={attemptMetrics}
              {...(via === "keyboard" && !noDrag
                ? { notice: t("Lần gửi này dùng bàn phím. Các chỉ số kéo lấy từ một lần thử bằng con trỏ trước đó trong phiên này.", "This submission used the keyboard. The drag metrics come from an earlier pointer attempt in this session.") }
                : noDrag
                  ? { notice: t("Không ghi được lần kéo bằng con trỏ nào (dùng bàn phím), nên không có chỉ số kéo.", "No pointer drag was recorded (keyboard interaction), so drag metrics are not available.") }
                  : {})}
            />
            <MetricTable heading={t("Cả phiên (chuyển động con trỏ)", "Whole session (pointer motion)")} metrics={sessionMetrics} />
            <p className="text-xs text-muted">
              {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> · {t("bộ trích xuất", "extractor")}{" "}
              <span className="font-mono">{featureSet.extractorVersion}</span> · {t("cách nhập", "input")}: {session.inputModality}.{" "}
              {t(
                "Đây chỉ là các số đo mô tả của một lần tương tác này, không phải bằng chứng cho thấy nó do người hay phần mềm thực hiện. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
                "These are descriptive measurements of this one interaction, not evidence that it was made by a person or by software. Data stays in this browser tab.",
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card id="velocity-h" title={t("Vận tốc", "Velocity")}>
        <MotionChart
          title={t("Vận tốc", "Velocity")}
          unit="px/s"
          segments={velocitySegments}
          xDomain={domain}
          includeZero
          selectedT={selectedT}
          formatValue={axisNumber}
          formatCell={(v) => formatVelocity(v, 1)}
          segmentLabel={t("Lần kéo", "Drag")}
          testId="chart-velocity"
          scopeNote={chartScope}
        />
      </Card>

      <Card id="accel-h" title={t("Gia tốc", "Acceleration")}>
        <MotionChart
          title={t("Gia tốc", "Acceleration")}
          unit="px/s²"
          segments={accelerationSegments}
          xDomain={domain}
          includeZero
          selectedT={selectedT}
          formatValue={axisNumber}
          formatCell={(v) => formatAcceleration(v, 1)}
          segmentLabel={t("Lần kéo", "Drag")}
          testId="chart-acceleration"
          scopeNote={`${chartScope} ${t(
            "Tính từ các mẫu vận tốc (độ thay đổi tốc độ giữa các đoạn liên tiếp).",
            "Computed from the velocity samples (change in speed between consecutive segments).",
          )}`}
        />
      </Card>

      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} annotations={annotations} />
      </Card>
    </section>
  );
}
