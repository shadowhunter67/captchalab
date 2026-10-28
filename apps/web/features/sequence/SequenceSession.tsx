"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import {
  SEQUENCE_TARGET,
  makeOptionTarget,
  registry,
  toTextKeyCode,
  type SequenceAnswer,
  type SequenceChallenge,
  type SequenceFeatures,
} from "@captchalab/captcha-plugins";
import { ShapeGlyph } from "@/components/ShapeGlyph";
import { useT } from "@/lib/i18n";
import type { SessionReport } from "@/lib/behavior/human";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { SequenceInspect } from "./SequenceInspect";
import { numberAnswer, optionAnswer, optionLabel, spokenNumberSequence, spokenShapeSequence, toggleOption } from "./sequence-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<SequenceFeatures>;
}

interface Props {
  challenge: SequenceChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session (the parent keys it by challenge). Number: the typed value lives only in the
 * input element and is read once, on submit; key events are stored with coarsened codes. Visual: option
 * buttons are native toggle buttons; pointer and Space/Enter are recorded separately from the click.
 */
export function SequenceSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("sequence");
  const inputRef = useRef<HTMLInputElement>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [chosen, setChosen] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stale = (): void => {
    setCompleted(null);
    setError(null);
    onReset?.();
  };

  const optionsRef = useRef<HTMLDivElement>(null);
  const recordKey = (type: "keydown" | "keyup", e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.nativeEvent.isComposing) return;
    recorder.record({ type, code: toTextKeyCode(e.code), target: SEQUENCE_TARGET });
  };

  const recordPointer = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>, id: string): void => {
    const rect = optionsRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (!sample) return;
    // A captured touch/pen release outside the button does not click it: record a cancel.
    const b = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    const recorded: PointerKind = kind === "pointerup" && !inside ? "pointercancel" : kind;
    recorder.record(toRecorderEvent(recorded, sample, makeOptionTarget(id)));
  };

  const recordOptionKey = (e: KeyboardEvent<HTMLButtonElement>, id: string): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code !== "Space" && code !== "Enter") return;
    if (e.repeat) e.preventDefault(); // a held key must not activate again
    else recorder.record({ type: "keydown", code, target: makeOptionTarget(id) });
  };

  const finish = (answer: SequenceAnswer): boolean => {
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, answer, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
      onResult?.({ session, context: undefined, passed: verification.passed });
      return verification.passed;
    } catch (err) {
      console.error("Sequence submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
      return false;
    }
  };

  const onSubmitNumber = (e: FormEvent): void => {
    e.preventDefault();
    const passed = finish(numberAnswer(inputRef.current?.value ?? ""));
    // The value is only needed to verify: once passed, do not leave it in the field.
    if (passed && inputRef.current) inputRef.current.value = "";
  };

  const buttons = (
    <div className="flex flex-wrap gap-3">
      <button
        type={challenge.kind === "number" ? "submit" : "button"}
        onClick={challenge.kind === "visual" ? () => finish(optionAnswer(chosen)) : undefined}
        data-testid="verify"
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
      >
        {t("Xác minh", "Verify")}
      </button>
      <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
        {t("Thử thách mới", "New challenge")}
      </button>
    </div>
  );

  const box = "flex h-14 w-14 items-center justify-center rounded-md border-2 text-xl font-semibold sm:h-16 sm:w-16";

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {challenge.kind === "number"
            ? t("Tìm số còn thiếu trong dãy, gõ vào ô rồi nhấn Xác minh hoặc Enter.", "Find the missing number in the sequence, type it in the field, then press Verify or Enter.")
            : t("Chọn hình còn thiếu trong mẫu lặp, rồi nhấn Xác minh.", "Choose the shape that is missing from the repeating pattern, then press Verify.")}
        </p>

        {challenge.kind === "number" ? (
          <form onSubmit={onSubmitNumber} className="space-y-3">
            <div>
              <p className="sr-only" data-testid="seq-spoken">
                {t("Dãy số: ", "Number sequence: ")}
                {spokenNumberSequence(challenge.terms, t)}
              </p>
              <div aria-hidden="true" className="flex flex-wrap gap-2">
                {challenge.terms.map((term, i) => (
                  <div key={i} data-testid={`seq-term-${i}`} className={`${box} ${term === null ? "border-dashed border-accent" : "border-line bg-bg"}`}>
                    {term === null ? <span data-testid="seq-hidden">?</span> : term}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="seq-answer" className="mb-1 block text-sm font-medium">
                {t("Số còn thiếu", "Missing number")}
              </label>
              <input
                id="seq-answer"
                ref={inputRef}
                data-testid="seq-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={10}
                onChange={stale}
                onKeyDown={(e) => recordKey("keydown", e)}
                onKeyUp={(e) => recordKey("keyup", e)}
                className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 font-mono text-lg"
              />
            </div>
            {buttons}
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="sr-only" data-testid="seq-spoken">
                {t("Dãy hình: ", "Shape sequence: ")}
                {spokenShapeSequence(challenge.cells, t)}
              </p>
              <div aria-hidden="true" className="flex flex-wrap gap-2">
                {challenge.cells.map((cell, i) => (
                  <div key={i} data-testid={`seq-cell-${i}`} className={`${box} p-2 ${cell === null ? "border-dashed border-accent" : "border-line bg-bg"}`}>
                    {cell === null ? <span data-testid="seq-hidden">?</span> : <ShapeGlyph shape={cell} />}
                  </div>
                ))}
              </div>
            </div>
            <div ref={optionsRef} role="group" aria-label={t("Các lựa chọn cho hình còn thiếu", "Options for the missing shape")} className="flex flex-wrap gap-2">
              {challenge.options.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={chosen === o.id}
                  aria-label={optionLabel(i, challenge.options.length, o.shape, t)}
                  data-testid={`option-${o.id}`}
                  onPointerDown={(e) => recordPointer("pointerdown", e, o.id)}
                  onPointerUp={(e) => recordPointer("pointerup", e, o.id)}
                  onPointerCancel={(e) => recordPointer("pointercancel", e, o.id)}
                  onKeyDown={(e) => recordOptionKey(e, o.id)}
                  onClick={() => {
                    setChosen((c) => toggleOption(c, o.id));
                    stale();
                  }}
                  className={`h-16 w-16 touch-manipulation rounded-md border-2 bg-bg p-2 ${chosen === o.id ? "border-accent ring-2 ring-accent" : "border-line hover:bg-track"}`}
                >
                  <ShapeGlyph shape={o.shape} />
                </button>
              ))}
            </div>
            {buttons}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: ô nhập hoặc các nút lựa chọn đều có nhãn và dùng được bằng bàn phím (Tab, rồi Space hoặc Enter). Quy luật đơn giản rất dễ bị phần mềm tự động giải. Đây chỉ là bản minh họa, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: the input or the option buttons are labelled and work with the keyboard (Tab, then Space or Enter). Simple pattern logic is trivial to automate. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && showInspect && (
        <SequenceInspect key={completed.submission} kind={challenge.kind} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
