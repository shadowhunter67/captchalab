"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import {
  EMPTY_RECALL,
  MEMORY_CLEAR_TARGET,
  MEMORY_START_TARGET,
  MEMORY_UNDO_TARGET,
  applyRecall,
  makeMemoryCellTarget,
  makeMemoryOptionTarget,
  memoryAnswer,
  registry,
  type MemoryActivation,
  type MemoryChallenge,
  type MemoryFeatures,
  type RecallState,
} from "@captchalab/captcha-plugins";
import { ShapeGlyph } from "@/components/ShapeGlyph";
import { useT } from "@/lib/i18n";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { MemoryInspect } from "./MemoryInspect";
import {
  cellIds,
  cellLabel,
  isLitCell,
  nextPhase,
  optionLabel,
  optionShape,
  previewItems,
  previewStatus,
  recallStatus,
  slotLabel,
  type MemoryPhase,
} from "./memory-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<MemoryFeatures>;
}

interface Props {
  challenge: MemoryChallenge;
  onNewChallenge: () => void;
}

const btn = "touch-manipulation rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:cursor-not-allowed disabled:opacity-60";

/**
 * One challenge = one session (the parent keys it by challenge). Lifecycle: ready -> preview (content visible for
 * challenge.previewMs, one timer) -> recall (content gone). All timer callbacks check a run token, and the timer is
 * cleared when the phase leaves "preview" and on unmount, so a new challenge never inherits an old run.
 */
export function MemorySession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("memory");
  const boardRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));

  const [phase, setPhase] = useState<MemoryPhase>("ready");
  const phaseRef = useRef<MemoryPhase>("ready");
  const runIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recallStartRef = useRef<number | null>(null);
  const [shrink, setShrink] = useState(false);

  const [recall, setRecall] = useState<RecallState>(EMPTY_RECALL);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTimer = (): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Unmount (new challenge, variant, difficulty or seed change): invalidate the run and leave no timer behind.
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      clearTimer();
    };
  }, []);

  // The one preview timer. Re-running (StrictMode) clears and re-arms it; leaving "preview" clears it.
  useEffect(() => {
    if (phase !== "preview") return;
    const token = runIdRef.current;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (token !== runIdRef.current || phaseRef.current !== "preview") return;
      timerRef.current = null;
      recallStartRef.current = recorder.elapsedMs();
      phaseRef.current = nextPhase(phaseRef.current, "timeout");
      setPhase(phaseRef.current);
    }, challenge.previewMs);
    // The progress bar needs one painted frame at full width before it shrinks.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (token === runIdRef.current) setShrink(true);
      });
    });
    return () => {
      clearTimer();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, challenge.previewMs, recorder]);

  const stale = (): void => {
    setCompleted(null);
    setError(null);
  };

  const start = (): void => {
    if (phaseRef.current !== "ready") return; // a second Start never makes a second timer
    runIdRef.current += 1;
    phaseRef.current = nextPhase("ready", "start");
    setShrink(false);
    setPhase(phaseRef.current);
    stale();
  };

  // Keyboard users lose the focused Start button: move focus to the status line when the preview begins.
  useEffect(() => {
    if (phase === "preview") statusRef.current?.focus();
  }, [phase]);

  const activate = (act: MemoryActivation): void => {
    if (phaseRef.current !== "recall") return;
    const step = applyRecall(recall, act, challenge);
    if (step.effect === "none") return;
    setRecall(step.state);
    stale();
  };

  const recordPointer = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>, target: string): void => {
    const rect = boardRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (!sample) return;
    // A captured touch/pen release outside the button does not click it: record a cancel.
    const b = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    const recorded: PointerKind = kind === "pointerup" && !inside ? "pointercancel" : kind;
    recorder.record(toRecorderEvent(recorded, sample, target));
  };

  const recordKey = (e: KeyboardEvent<HTMLButtonElement>, target: string): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code !== "Space" && code !== "Enter") return;
    if (e.repeat) e.preventDefault(); // a held key must not activate again
    else recorder.record({ type: "keydown", code, target });
  };

  /** Pointer + key handlers for one control. */
  const handlers = (target: string) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => recordPointer("pointerdown", e, target),
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => recordPointer("pointerup", e, target),
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => recordPointer("pointercancel", e, target),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => recordKey(e, target),
  });

  const verify = (): void => {
    if (phaseRef.current !== "recall") return;
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, memoryAnswer(challenge, recall), session);
      const featureSet = plugin.extractFeatures(challenge, session, { recallStartMs: recallStartRef.current });
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
    } catch (err) {
      console.error("Memory submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const items = previewItems(challenge);
  const sequenceLength = challenge.kind === "sequence" ? challenge.sequence.length : 0;
  const tile = "flex h-16 w-16 items-center justify-center rounded-md border-2 p-2";

  const previewView =
    challenge.kind === "sequence" ? (
      <div aria-hidden="true" className="flex flex-wrap items-center gap-2" data-testid="mem-preview">
        {items.map((it, i) => (
          <div key={it.n} className="flex items-center gap-2">
            {i > 0 && <span className="text-lg text-muted">→</span>}
            <div data-testid={`preview-item-${it.n}`} className={`${tile} relative border-line bg-bg`}>
              <ShapeGlyph shape={it.shape} />
              <span className="absolute -left-1 -top-2 rounded bg-accent px-1 text-xs font-semibold text-bg">{it.n}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div aria-hidden="true" className="grid w-fit gap-2" style={{ gridTemplateColumns: `repeat(${challenge.size}, 4rem)` }} data-testid="mem-preview">
        {cellIds(challenge.size).map((id) => {
          const lit = isLitCell(challenge, id);
          return (
            <div
              key={id}
              data-testid={`cell-${id}`}
              {...(lit ? { "data-lit": "true" } : {})}
              className={`h-16 w-16 rounded-md border-2 ${lit ? "border-accent bg-accent" : "border-line bg-bg"}`}
            />
          );
        })}
      </div>
    );

  const recallView =
    challenge.kind === "sequence" ? (
      <div className="space-y-4">
        <div role="group" aria-label={t("Các hình đã chọn theo thứ tự", "Shapes chosen so far, in order")} className="flex flex-wrap gap-2" data-testid="mem-chosen">
          {Array.from({ length: sequenceLength }, (_, i) => {
            const id = recall.selected[i];
            const shape = id === undefined ? null : optionShape(challenge, id);
            return (
              <div
                key={i}
                role="img"
                aria-label={slotLabel(i + 1, sequenceLength, shape, t)}
                data-testid={`chosen-${i + 1}`}
                data-filled={shape === null ? "false" : "true"}
                className={`${tile} ${shape === null ? "border-dashed border-line" : "border-accent bg-bg"}`}
              >
                {shape !== null && <ShapeGlyph shape={shape} />}
              </div>
            );
          })}
        </div>
        <div role="group" aria-label={t("Các hình để chọn", "Shapes to choose from")} className="flex flex-wrap gap-2">
          {challenge.options.map((o, i) => {
            const chosen = recall.selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={chosen}
                disabled={chosen}
                aria-label={optionLabel(i, challenge.options.length, o.shape, chosen, t)}
                data-testid={`option-${o.id}`}
                {...handlers(makeMemoryOptionTarget(o.id))}
                onClick={() => activate({ kind: "option", id: o.id })}
                className={`h-16 w-16 touch-manipulation rounded-md border-2 bg-bg p-2 disabled:opacity-60 ${chosen ? "border-accent" : "border-line hover:bg-track"}`}
              >
                <ShapeGlyph shape={o.shape} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="mem-undo"
            disabled={recall.selected.length === 0}
            {...handlers(MEMORY_UNDO_TARGET)}
            onClick={() => activate({ kind: "undo" })}
            className={`${btn} min-h-14 min-w-14`}
          >
            {t("Hoàn tác", "Undo")}
          </button>
          <button
            type="button"
            data-testid="mem-clear"
            disabled={recall.selected.length === 0}
            {...handlers(MEMORY_CLEAR_TARGET)}
            onClick={() => activate({ kind: "clear" })}
            className={`${btn} min-h-14 min-w-14`}
          >
            {t("Xoá", "Clear")}
          </button>
        </div>
      </div>
    ) : (
      <div role="group" aria-label={t("Lưới các ô", "Grid of cells")} className="grid w-fit gap-2" style={{ gridTemplateColumns: `repeat(${challenge.size}, 4rem)` }}>
        {cellIds(challenge.size).map((id) => {
          const on = recall.selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              aria-label={cellLabel(id, challenge.size, t)}
              data-testid={`cell-${id}`}
              {...handlers(makeMemoryCellTarget(id))}
              onClick={() => activate({ kind: "cell", id })}
              className={`h-16 w-16 touch-manipulation rounded-md border-2 ${on ? "border-accent bg-accent" : "border-line bg-bg hover:bg-track"}`}
            />
          );
        })}
      </div>
    );

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {challenge.kind === "sequence"
            ? t(
                "Nhấn Bắt đầu, xem dãy hình trong vài giây, rồi chọn lại các hình theo đúng thứ tự khi chúng đã ẩn. Nhấn Xác minh để kiểm tra.",
                "Press Start, watch the shapes for a few seconds, then choose them again in the same order once they are hidden. Press Verify to check.",
              )
            : t(
                "Nhấn Bắt đầu, xem các ô được tô sáng trong vài giây, rồi bật lại đúng các ô đó khi chúng đã ẩn. Nhấn Xác minh để kiểm tra.",
                "Press Start, watch the highlighted cells for a few seconds, then select the same cells once they are hidden. Press Verify to check.",
              )}
        </p>

        <div ref={boardRef} className="space-y-4" data-testid="memory" data-phase={phase}>
          {phase === "ready" && (
            <button
              type="button"
              data-testid="mem-start"
              {...handlers(MEMORY_START_TARGET)}
              onClick={start}
              className="min-h-14 touch-manipulation rounded-md bg-accent px-6 py-2 text-base font-medium text-bg hover:opacity-90"
            >
              {t("Bắt đầu", "Start")}
            </button>
          )}
          {phase === "preview" && (
            <div className="space-y-3">
              <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" data-testid="mem-preview-status" className="text-sm font-medium outline-none">
                {previewStatus(challenge.previewMs, challenge.kind, t)}
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded bg-track" aria-hidden="true">
                <div
                  className="h-full bg-accent"
                  style={{ width: shrink ? "0%" : "100%", transition: shrink ? `width ${challenge.previewMs}ms linear` : "none" }}
                />
              </div>
              {previewView}
            </div>
          )}
          {phase === "recall" && (
            <div className="space-y-4">
              <p role="status" aria-live="polite" data-testid="mem-recall-status" className="text-sm font-medium">
                {recallStatus(challenge.kind, t)}
              </p>
              {recallView}
              <div className="flex flex-wrap gap-3">
                <button type="button" data-testid="verify" onClick={verify} className="min-h-14 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-bg hover:opacity-90">
                  {t("Xác minh", "Verify")}
                </button>
              </div>
            </div>
          )}
          <div>
            <button type="button" onClick={onNewChallenge} className={`${btn} min-h-14`}>
              {t("Thử thách mới", "New challenge")}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: CAPTCHA này đo trí nhớ nên có thể gây khó khăn về nhận thức; không cho rằng ai cũng dùng được. Các nút đều có nhãn và dùng được bằng bàn phím (Tab, rồi Space hoặc Enter). Nội dung cần nhớ cố ý không được đọc to, vì như vậy sẽ làm mất ý nghĩa của bài. Đây chỉ là bản minh họa, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: this CAPTCHA tests memory, so it raises cognitive-accessibility concerns and is not claimed to be usable by everyone. Every button is labelled and works with the keyboard (Tab, then Space or Enter). The content to remember is deliberately not read aloud, because that would defeat the task. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && <MemoryInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />}
    </div>
  );
}
