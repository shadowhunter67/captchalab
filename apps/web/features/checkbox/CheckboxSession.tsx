"use client";

import { useRef, useState } from "react";
import {
  createEventRecorder,
  type FeatureSet,
  type InteractionSession,
  type VerificationResult,
} from "@captchalab/captcha-core";
import { registry, type CheckboxChallenge, type CheckboxFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import type { SessionReport } from "@/lib/behavior/human";
import { CheckboxController } from "./checkbox-controller";
import { CheckboxInspect } from "./CheckboxInspect";
import { CheckboxSurface, type ControlSize } from "./CheckboxSurface";

interface Completed {
  /** Increments per submission; keys the Inspect view so selection/replay never carry over. */
  submission: number;
  session: InteractionSession;
  size: ControlSize;
  verification: VerificationResult;
  featureSet: FeatureSet<CheckboxFeatures>;
}

const FALLBACK_SIZE: ControlSize = { width: 360, height: 56 };

interface Props {
  challenge: CheckboxChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session. The parent keys this component by challenge, so a new challenge
 * remounts it and drops the recorder, checked state, result, selection and replay with it.
 * Unchecking and checking again stays in the same session (activations accumulate).
 */
export function CheckboxSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const [challenge] = useState(initialChallenge); // pinned: drawn, verified and analyzed as one challenge
  const checkbox = registry.get("checkbox");
  const measureRef = useRef<() => ControlSize | null>(() => null);
  const submissionsRef = useRef(0);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [controller] = useState(() => {
    // Raw events go to the recorder buffer only; React state sees the checked flag and the final result.
    const recorder = createEventRecorder({ captchaId: checkbox.id });
    return new CheckboxController({
      recorder,
      onChecked: setChecked,
      onClear: () => {
        setCompleted(null);
        setError(null);
        onResetRef.current?.();
      },
      onSubmit: (answer) => {
        try {
          const session = recorder.snapshot();
          // Correctness and behavior are computed independently by the plugin.
          const verification = checkbox.verify(challenge, answer, session);
          const featureSet = checkbox.extractFeatures(challenge, session);
          submissionsRef.current += 1;
          setCompleted({
            submission: submissionsRef.current,
            session,
            size: measureRef.current() ?? FALLBACK_SIZE,
            verification,
            featureSet,
          });
          setError(null);
          onResultRef.current?.({ session, context: undefined, passed: verification.passed });
        } catch (err) {
          console.error("Checkbox submission failed", err instanceof Error ? err.message : "unknown error");
          setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
        }
      },
    });
  });

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Đánh dấu ô bằng cách nhấp hoặc chạm, hoặc dùng phím Tab để chọn rồi nhấn Space. Ô được xác minh ngay khi đánh dấu; bỏ đánh dấu để thử lại.",
            "Check the box with a click or tap, or focus it with Tab and press Space. It is verified as soon as it is checked; uncheck it to try again.",
          )}
        </p>
        <CheckboxSurface controller={controller} checked={checked} measureRef={measureRef} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onNewChallenge}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
          >
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: đây là ô đánh dấu gốc của trình duyệt, nên có tên, trạng thái đã đánh dấu, tiêu điểm bàn phím và kích hoạt bằng Space cho công nghệ hỗ trợ. Kết quả được thông báo bằng văn bản. Điều đó không có nghĩa mọi CAPTCHA đều dễ tiếp cận: bản demo này không có lựa chọn thay thế cho ô đánh dấu, và các hệ thống thật đặt ô đánh dấu trước một thử thách lớn hơn có thể đưa ra những bước khác, khó dùng hơn.",
            "Accessibility: this is a native checkbox, so it has a name, a checked state, keyboard focus and Space activation for assistive technology. The result is announced as text. That does not make a CAPTCHA accessible in general: this demo has no alternative to the checkbox, and real systems that put a checkbox in front of a larger challenge may present other, less accessible steps.",
          )}
        </p>
      </section>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {completed && showInspect && (
        <CheckboxInspect
          key={completed.submission}
          verification={completed.verification}
          featureSet={completed.featureSet}
          session={completed.session}
          size={completed.size}
        />
      )}
    </div>
  );
}
