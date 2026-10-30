"use client";

import { useRef, useState } from "react";
import { createEventRecorder, type EventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import {
  registry,
  type SliderAnswer,
  type SliderChallenge,
  type SliderFeatures,
  type SliderLayout,
} from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { SliderController, type SliderPhase, type SubmitVia } from "./slider-controller";
import { SliderSurface } from "./SliderSurface";
import { SliderInspect } from "./SliderInspect";
import type { SessionMarker } from "@/lib/replay/markers";
import { useScopedId } from "@/lib/id-scope";

interface Completed {
  /** Increments per submission; keys the Inspect view so selection/replay never carry over. */
  submission: number;
  markers: SessionMarker[];
  answer: SliderAnswer;
  layout: SliderLayout;
  session: InteractionSession;
  via: SubmitVia;
  verification: VerificationResult;
  featureSet: FeatureSet<SliderFeatures>;
}

export interface SliderResult {
  session: InteractionSession;
  featureSet: FeatureSet<SliderFeatures>;
  layout: SliderLayout;
  verification: VerificationResult;
}

interface Props {
  challenge: SliderChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by Compare). */
  onResult?: (result: SliderResult) => void;
  /** Called when the shown result is discarded ("Try again"). */
  onReset?: () => void;
  /** Hide the Inspect panel (Compare shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session. The parent keys this component by challenge, so a new challenge
 * remounts it and drops the recorder, controller, result and replay with it: nothing carries over.
 */
export function SliderSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const sid = useScopedId();
  // Pinned at mount: what is drawn, verified and analyzed is always the same challenge, even if a
  // parent forgot to remount with a new key.
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;
  const [challenge] = useState(initialChallenge);
  const slider = registry.get("slider");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult; // the controller below is created once; it must see the latest callback
  const applyPositionRef = useRef<(position: number) => void>(() => {});
  const [phase, setPhase] = useState<SliderPhase>("disabled");
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI annotations that are not input events (see lib/replay/markers.ts). Local to this session.
  const markersRef = useRef<SessionMarker[]>([]);
  const submissionsRef = useRef(0);
  const [{ controller, recorder }] = useState(() => {
    // Raw events go to the recorder buffer only; React state sees phase and the final result.
    const recorder: EventRecorder = createEventRecorder({ captchaId: slider.id });
    const controller = new SliderController({
      recorder,
      onPosition: (p) => applyPositionRef.current(p),
      onPhase: setPhase,
      onSubmit: (answer, layout, via) => {
        try {
          const session = recorder.snapshot();
          // Correctness and behavior are computed independently by the plugin.
          const verification = slider.verify(challenge, answer, session);
          const featureSet = slider.extractFeatures(challenge, session, { layout });
          submissionsRef.current += 1;
          setCompleted({
            submission: submissionsRef.current,
            markers: [...markersRef.current],
            answer,
            layout,
            session,
            via,
            verification,
            featureSet,
          });
          setError(null);
          onResultRef.current?.({ session, featureSet, layout, verification });
        } catch (err) {
          console.error("Slider submission failed", err instanceof Error ? err.message : "unknown error");
          setError(tRef.current("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
        }
      },
    });
    return { controller, recorder };
  });

  const tryAgain = (): void => {
    // The handle snaps back to 0. That is a UI action, not input: record it as a marker so replay can show it.
    markersRef.current.push({ type: "attempt-reset", t: recorder.elapsedMs(), position: 0 });
    setCompleted(null);
    setError(null);
    onReset?.();
    controller.tryAgain();
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby={sid("try-h")} className="rounded-lg border border-line bg-panel p-4">
        <h2 id={sid("try-h")} className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Kéo tay nắm cho khớp với khung nét đứt rồi thả ra. Bàn phím: phím mũi tên di chuyển tay nắm, Enter để gửi.",
            "Drag the handle so it lands on the dashed outline, then release. Keyboard: Arrow keys move the handle, Enter submits.",
          )}
        </p>
        <SliderSurface
          controller={controller}
          target={challenge.target}
          tolerance={challenge.tolerance}
          phase={phase}
          applyPositionRef={applyPositionRef}
        />
        {phase === "disabled" && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {t(
              "Không đo được thanh trượt ở kích thước này nên đã tắt tương tác. Hãy mở rộng cửa sổ.",
              "The slider cannot be measured at this size, so interaction is disabled. Widen the window.",
            )}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onNewChallenge}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
          >
            {t("Thử thách mới", "New challenge")}
          </button>
          {phase === "submitted" && (
            <button
              type="button"
              onClick={tryAgain}
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
            >
              {t("Thử lại (cùng thử thách)", "Try again (same challenge)")}
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: hỗ trợ con trỏ và điều khiển bàn phím cơ bản. Hỗ trợ trình đọc màn hình còn hạn chế: đích chỉ được thể hiện bằng hình ảnh, và tay nắm chỉ cho biết vị trí của nó. Đây là thử thách minh hoạ, không thay thế được một CAPTCHA thực tế có khả năng tiếp cận tốt.",
            "Accessibility: pointer and basic keyboard control are supported. Screen-reader support is limited: the target is conveyed visually, and the handle exposes only its position. This is a demonstration challenge and is not a substitute for an accessible production CAPTCHA.",
          )}
        </p>
      </section>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {showInspect && completed && (
        <SliderInspect
          key={completed.submission}
          verification={completed.verification}
          featureSet={completed.featureSet}
          session={completed.session}
          markers={completed.markers}
          layout={completed.layout}
          challenge={challenge}
          via={completed.via}
        />
      )}
    </div>
  );
}
