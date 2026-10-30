"use client";

import { useEmbedReport } from "@/lib/embed-report";
import { useMemo } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { AudioFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/inspect/Card";
import { ChallengeConfigSlot } from "@/components/inspect/ChallengeConfigCard";
import { EventExplorer } from "@/components/inspect/EventExplorer";
import { MetricTable } from "@/components/inspect/MetricTable";
import { VerificationSummary } from "@/components/inspect/VerificationSummary";
import { useEventSelection } from "@/lib/inspect/useEventSelection";
import { audioMetrics } from "./audio-view-data";
import { useScopedId } from "@/lib/id-scope";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<AudioFeatures>;
  session: InteractionSession;
}

/** Audio Inspect: result, metrics, timeline and inspector. No trajectory, chart or replay. */
export function AudioInspect({ verification, featureSet, session }: Props) {
  const sid = useScopedId();
  useEmbedReport(verification, session, featureSet);
  const t = useT();
  const selection = useEventSelection(session);
  const metrics = useMemo(() => audioMetrics(featureSet.features, t), [featureSet, t]);
  return (
    <section aria-labelledby={sid("inspect-h")} className="space-y-4" data-testid="inspect">
      <h2 id={sid("inspect-h")} className="text-base font-semibold">
        {t("Phân tích", "Inspect")}
      </h2>
      <VerificationSummary passed={verification.passed} reason={verification.reason} />

      <ChallengeConfigSlot />
      <Card id="metrics-h" title={t("Chỉ số hành vi", "Behavioral metrics")}>
        <div className="space-y-4">
          <MetricTable heading={t("Phát và gõ", "Playing and typing")} metrics={metrics} />
          <p className="text-xs text-muted">
            {t("Bộ chỉ số", "Feature set")} <span className="font-mono">{featureSet.schemaVersion}</span> · {t("bộ trích xuất", "extractor")}{" "}
            <span className="font-mono">{featureSet.extractorVersion}</span>.{" "}
            {t(
              "Đây chỉ là các số đo mô tả lần tương tác này, không phải bằng chứng cho thấy do người hay phần mềm thực hiện. Bản ghi chỉ lưu loại phím (Digit, Backspace…), không bao giờ lưu bạn đã nhấn chữ số nào. Không dùng micro và không ghi lại gì từ bạn. Dữ liệu chỉ nằm trong thẻ trình duyệt này.",
              "Descriptive measurements of this one interaction, not evidence that it was made by a person or by software. The recording stores key classes (Digit, Backspace…), never which digit you pressed. No microphone is used and nothing is recorded from you. Data stays in this browser tab.",
            )}
          </p>
        </div>
      </Card>
      <Card id="events-h" title={t("Dòng thời gian sự kiện", "Event timeline")}>
        <EventExplorer session={session} selection={selection} />
        <p className="mt-3 text-xs text-muted">
          {t(
            "CAPTCHA này không có đường đi, biểu đồ hay phát lại: không có đường đi nào để vẽ.",
            "No trajectory, chart or replay for this CAPTCHA: there is no path to draw.",
          )}
        </p>
      </Card>
    </section>
  );
}
