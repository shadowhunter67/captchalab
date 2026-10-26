"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { MATH_TARGET, formatExpr, registry, toTextKeyCode, type MathChallenge, type MathLogicFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { MathInspect } from "./MathInspect";
import { speakExpr } from "./math-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<MathLogicFeatures>;
}

interface Props {
  challenge: MathChallenge;
  onNewChallenge: () => void;
}

/**
 * One challenge = one session (the parent keys it by challenge). The typed value lives only in the input
 * element and is read once, when verifying: it is not kept in React state, storage or the recording.
 * Key events are stored with coarsened codes (digits -> "Digit"). The prompt is drawn from the expression tree.
 */
export function MathSession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("math-logic");
  const inputRef = useRef<HTMLInputElement>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = (type: "keydown" | "keyup", e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.nativeEvent.isComposing) return; // IME composition: individual keys are not meaningful
    recorder.record({ type, code: toTextKeyCode(e.code), target: MATH_TARGET });
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { value: inputRef.current?.value ?? "" }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
      // The value is only needed to verify: once the challenge is passed, do not leave it in the field.
      if (verification.passed && inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Math submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const box = "rounded-md border border-line bg-bg px-4 py-3 text-center font-mono text-2xl tabular-nums";
  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {challenge.kind === "comparison"
            ? t("Gõ giá trị lớn hơn, rồi nhấn Xác minh hoặc Enter.", "Type the larger value, then press Verify or Enter.")
            : t("Tính kết quả và gõ một số nguyên, rồi nhấn Xác minh hoặc Enter.", "Work out the result and type a whole number, then press Verify or Enter.")}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          {challenge.kind === "comparison" && challenge.other ? (
            <div role="group" aria-label={t("Hai giá trị cần so sánh", "The two values to compare")} className="space-y-2">
              <p className="text-sm font-medium">{t("Gõ giá trị lớn hơn.", "Type the larger value.")}</p>
              <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                <div className={box} data-testid="math-left">
                  {formatExpr(challenge.expr)}
                </div>
                <div className={box} data-testid="math-right">
                  {formatExpr(challenge.other)}
                </div>
              </div>
              <span className="sr-only">
                {t("Bên trái: ", "Left: ")}
                {speakExpr(challenge.expr, t)}
                {t(". Bên phải: ", ". Right: ")}
                {speakExpr(challenge.other, t)}
              </span>
            </div>
          ) : (
            <div role="group" aria-label={t("Phép tính", "Calculation")}>
              <div className={`${box} text-3xl`} data-testid="math-prompt" aria-hidden="true">
                {formatExpr(challenge.expr)} = ?
              </div>
              <span className="sr-only">
                {speakExpr(challenge.expr, t)} {t("bằng bao nhiêu?", "equals what?")}
              </span>
            </div>
          )}
          <div>
            <label htmlFor="math-answer" className="mb-1 block text-sm font-medium">
              {t("Câu trả lời của bạn", "Your answer")}
            </label>
            <input
              id="math-answer"
              ref={inputRef}
              data-testid="math-answer"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={10}
              // Any change of the content (typing, paste, drop, speech, IME) makes a shown result stale.
              onChange={() => {
                setCompleted(null);
                setError(null);
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
            "Khả năng tiếp cận: một ô nhập có nhãn, dùng được hoàn toàn bằng bàn phím, và phép tính có bản đọc cho trình đọc màn hình. Số học đơn giản rất dễ bị tự động hóa, nên đây chỉ là bản minh họa, không phải CAPTCHA dùng cho thực tế. Mức Khó tính khó hơn nhưng không bao giờ giảm độ tương phản hay ẩn nhãn.",
            "Accessibility: a labelled field that works fully with the keyboard, and the calculation has a spoken form for screen readers. Simple arithmetic is trivial to automate, so this is a demonstration, not a production CAPTCHA. Hard is harder to calculate but never lowers contrast or hides labels.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && (
        <MathInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
