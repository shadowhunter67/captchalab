"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, Point, VerificationResult } from "@captchalab/captcha-core";
import { deriveRotation, type RotationChallenge, type RotationFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
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
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const f = featureSet.features;
  const selection = useEventSelection(session);
  const analysis = useMemo(() => deriveRotation(challenge, { center }, session), [challenge, center, session]);
  const segments = useMemo(() => angularVelocitySegments(analysis), [analysis]);
  const domain = useMemo(() => dragDomain(analysis), [analysis]);
  const metrics = useMemo(() => rotationMetrics(f, t), [f, t]);

  return (
    <section aria-labelledby="inspect-h" className="space-y-4" data-testid="inspect">
      <h2 id="inspect-h" className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="replay-h" title={t("Phát lại", "Replay")}>
          <RotationReplay challenge={challenge} center={center} session={session} />
        </Card>
        <Card id="metrics-h" title={t("Chỉ số hành vi", "Behavioral metrics")}>
          <div className="space-y-4">
            <MetricTable heading={t("Xoay ảnh", "Rotation")} metrics={metrics} />
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
      <Card id="angvel-h" title={t("Vận tốc góc", "Angular velocity")}>
        <MotionChart
          title={t("Vận tốc góc", "Angular velocity")}
          unit="°/s"
          segments={segments}
          xDomain={domain}
          includeZero
          selectedT={selection.event?.t ?? null}
          formatValue={axis}
          formatCell={(v) => `${v.toFixed(1)} °/s`}
          segmentLabel={t("Lần kéo", "Drag")}
          testId="chart-angular-velocity"
          scopeNote={t(
            "Chỉ tính các lần kéo bằng con trỏ (có dấu: số dương là theo chiều kim đồng hồ). Xoay bằng bàn phím không có vận tốc.",
            "Pointer drags only (signed: positive is clockwise). Keyboard turns have no velocity.",
          )}
        />
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
      </Card>
    </section>
  );
}
