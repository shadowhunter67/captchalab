"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { TEXT_TARGET, registry, toTextKeyCode, type TextChallenge, type TextFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { TextImage } from "./TextImage";
import { TextInspect } from "./TextInspect";
import type { SessionReport } from "@/lib/behavior/human";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<TextFeatures>;
}

interface Props {
  challenge: TextChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session (the parent keys it by challenge). The typed text lives only in the input
 * element and is read once, when verifying: it is not kept in React state, storage or the recording.
 * Key events are stored with coarsened codes (letters -> "Letter", digits -> "Digit").
 */
export function TextSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("text");
  const inputRef = useRef<HTMLInputElement>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = (type: "keydown" | "keyup", e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.nativeEvent.isComposing) return; // IME composition: individual keys are not meaningful
    recorder.record({ type, code: toTextKeyCode(e.code), target: TEXT_TARGET });
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { text: inputRef.current?.value ?? "" }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
      onResult?.({ session, context: undefined, passed: verification.passed });
      // The text is only needed to verify: once the challenge is passed, do not leave it in the field.
      if (verification.passed && inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Text submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Gõ các ký tự bạn thấy (không phân biệt hoa thường), rồi nhấn Xác minh hoặc Enter.",
            "Type the characters you see (case does not matter), then press Verify or Enter.",
          )}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <TextImage challenge={challenge} />
          <div>
            <label htmlFor="text-answer" className="mb-1 block text-sm font-medium">
              {t("Các ký tự trong ảnh", "Characters in the image")}
            </label>
            <input
              id="text-answer"
              ref={inputRef}
              data-testid="text-answer"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              // Any change of the content (typing, paste, drop, speech, IME) makes a shown result stale.
              onChange={() => {
                setCompleted(null);
                setError(null);
                onReset?.();
              }}
              onKeyDown={(e) => record("keydown", e)}
              onKeyUp={(e) => record("keyup", e)}
              className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 font-mono text-lg tracking-widest"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" data-testid="verify" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
              {t("Xác minh", "Verify")}
            </button>
            <button
              type="button"
              onClick={onNewChallenge}
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
            >
              {t("Thử thách mới", "New challenge")}
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: một ô nhập có nhãn, có thể chọn và dùng bằng bàn phím. Nhiệm vụ là đọc một hình ảnh, và bản demo này không có lựa chọn thay thế bằng văn bản hay âm thanh, nên người không nhìn thấy ảnh sẽ không dùng được. Đây chỉ là bản minh họa, không phải CAPTCHA dùng cho thực tế.",
            "Accessibility: a labelled text field you can reach and use with the keyboard. The task is to read an image, and this demo has no text or audio alternative, so it is not accessible to people who cannot see the image. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && showInspect && (
        <TextInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
