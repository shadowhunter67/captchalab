"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import {
  deriveDragAttempts,
  type DragDropChallenge,
  type DragDropFeatures,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { MotionChart } from "@/components/inspect/MotionChart";
import { TrajectoryView } from "@/components/inspect/TrajectoryView";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { formatAcceleration, formatVelocity } from "@/lib/format";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { AttemptsTable } from "./AttemptsTable";
import { DragDropReplay } from "./DragDropReplay";
import { ShapeMark } from "./ShapeGlyph";
import {
  attemptLabels,
  attemptRows,
  buildDragDropTrajectory,
  dragDomain,
  dragDropMetrics,
  dragDropMotionSeries,
  selectedPoint,
} from "./drag-drop-view-data";
import { hitRadiusPx, itemSizePx, normalizedToPx } from "@captchalab/captcha-plugins";

interface Props {
  challenge: DragDropChallenge;
  verification: VerificationResult;
  featureSet: FeatureSet<DragDropFeatures>;
  session: InteractionSession;
  layout: DragDropLayout;
  /** The surface was resized after input: geometry-based numbers are approximate. */
  layoutChanged: boolean;
}

const axisNumber = (v: number): string => String(Math.round(v));

/**
 * Drag & Drop Inspect, composed from the same generic primitives as the other CAPTCHAs. Everything
 * CAPTCHA-specific (which tracks, labels, metrics) comes from drag-drop-view-data.ts.
 */
export function DragDropInspect({ challenge, verification, featureSet, session, layout, layoutChanged }: Props) {
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const f = featureSet.features;
  const chartScope = t(
    "Mỗi lần kéo là một đường, đánh số như trong chú giải; các đường không bao giờ nối giữa các lần thử.",
    "One line per drag attempt, numbered as in the legend; lines are never joined across attempts.",
  );
  const selection = useEventSelection(session);

  const analysis = useMemo(() => deriveDragAttempts(challenge, layout, session), [challenge, layout, session]);
  const labels = useMemo(() => attemptLabels(challenge, analysis, t), [challenge, analysis, t]);
  const series = useMemo(() => dragDropMotionSeries(analysis), [analysis]);
  const velocity = useMemo(() => series.segments.map((s) => s.velocity), [series]);
  const acceleration = useMemo(() => series.segments.map((s) => s.acceleration), [series]);
  const domain = useMemo(() => dragDomain(analysis), [analysis]);
  const trajectory = useMemo(() => buildDragDropTrajectory(analysis, layout), [analysis, layout]);
  const metrics = useMemo(() => dragDropMetrics(f, t), [f, t]);
  const rows = useMemo(() => attemptRows(challenge, analysis, t), [challenge, analysis, t]);
  const size = itemSizePx(challenge, layout);
  const radius = hitRadiusPx(challenge, layout);
  const kindOf = (itemId: string) => challenge.items.find((i) => i.id === itemId)?.kind ?? "circle";

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>

      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />
      {layoutChanged && (
        <p className="text-xs text-muted" data-testid="layout-changed-note">
          {t(
            "Cửa sổ đã bị đổi kích thước sau khi bạn bắt đầu. Vị trí điểm ảnh ghi trước đó được đọc theo kích thước hiện tại, nên sai lệch khi thả và kết quả thả của các lần kéo trước có thể chỉ là xấp xỉ.",
            "The window was resized after you started. Pixel positions recorded earlier are read at the current size, so release errors and drop outcomes for earlier drags may be approximate.",
          )}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="replay-h" title={t("Phát lại", "Replay")}>
          <DragDropReplay challenge={challenge} layout={layout} session={session} />
        </Card>
        <Card id="metrics-h" title={t("Chỉ số", "Metrics")}>
          <div className="space-y-4">
            <MetricTable heading={t("Kéo thả", "Drag & drop")} metrics={metrics} />
            <p className="text-xs text-muted">
              {t("Bộ đặc trưng", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> ·{" "}
              {t("bộ trích xuất", "extractor")} <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
              {t(
                "Đây là các số đo mô tả cho riêng lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
                "These are descriptive measurements of this one interaction, not evidence that it was made by a person or by software. Data stays in this browser tab.",
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card id="attempts-h" title={t("Các lần kéo", "Drag attempts")}>
        <AttemptsTable rows={rows} />
      </Card>

      <Card id="traj-h" title={t("Đường đi", "Trajectories")}>
        <TrajectoryView
          geometry={trajectory}
          testId="trajectory-svg"
          selectedPoint={selectedPoint(session, selection.index)}
          label={t(
            `Đường đi của con trỏ trong ${trajectory.paths.length} lần kéo, đánh số theo thứ tự. Hình tròn: điểm bắt đầu của lần kéo đầu. Hình vuông: điểm kết thúc của lần kéo cuối. Các vòng nét đứt là vùng thả.`,
            `Pointer trajectories of ${trajectory.paths.length} drag attempt(s), numbered in order. Circle: start of the first drag. Square: end of the last. Dashed circles are the drop areas.`,
          )}
          underlay={
            <>
              <rect {...trajectory.surface} fill="var(--track)" opacity={0.5} />
              {challenge.targets.map((t) => {
                const c = normalizedToPx(t.position, layout);
                return (
                  <g key={t.id}>
                    <circle cx={c.x} cy={c.y} r={radius} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
                    <ShapeMark kind={kindOf(t.acceptsItemId)} size={size * 0.7} outline x={c.x} y={c.y} />
                  </g>
                );
              })}
            </>
          }
          maxHeight={420}
        />
        <p className="mt-2 text-xs text-muted">
          {t(
            "Mỗi đường là một lần kéo (số khớp với bảng các lần kéo). CAPTCHA này không ghi lại việc rê chuột.",
            "Each line is one drag attempt (numbers match the attempts table). Hover is not recorded for this CAPTCHA.",
          )}
        </p>
      </Card>

      <Card id="velocity-h" title={t("Vận tốc", "Velocity")}>
        <MotionChart
          title={t("Vận tốc", "Velocity")}
          unit="px/s"
          segments={velocity}
          segmentLabels={labels}
          xDomain={domain}
          includeZero
          selectedT={selection.event?.t ?? null}
          formatValue={axisNumber}
          formatCell={(v) => formatVelocity(v, 1)}
          segmentLabel={t("Lần thử", "Attempt")}
          testId="chart-velocity"
          scopeNote={chartScope}
        />
      </Card>

      <Card id="accel-h" title={t("Gia tốc", "Acceleration")}>
        <MotionChart
          title={t("Gia tốc", "Acceleration")}
          unit="px/s²"
          segments={acceleration}
          segmentLabels={labels}
          xDomain={domain}
          includeZero
          selectedT={selection.event?.t ?? null}
          formatValue={axisNumber}
          formatCell={(v) => formatAcceleration(v, 1)}
          segmentLabel={t("Lần thử", "Attempt")}
          testId="chart-acceleration"
          scopeNote={`${chartScope} ${t("Tính từ các mẫu vận tốc.", "Computed from the velocity samples.")}`}
        />
      </Card>

      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
      </Card>
    </section>
  );
}
