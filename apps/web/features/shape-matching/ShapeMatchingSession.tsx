"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import {
  EMPTY_MATCH_STATE,
  answerFromState,
  applyActivation,
  makeSourceTarget,
  makeTargetTarget,
  registry,
  type MatchShape,
  type MatchState,
  type ShapeMatchingChallenge,
  type ShapeMatchingFeatures,
} from "@captchalab/captcha-plugins";
import { SHAPE_NAMES, ShapeGlyph } from "@/components/ShapeGlyph";
import { useT } from "@/lib/i18n";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { ShapeMatchingInspect } from "./ShapeMatchingInspect";
import { pairNumbers, sourceLabel, statusText, targetLabel } from "./shape-matching-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<ShapeMatchingFeatures>;
}

interface Props {
  challenge: ShapeMatchingChallenge;
  onNewChallenge: () => void;
}

/**
 * One challenge = one session (the parent keys it by challenge). Source and target buttons drive the plugin's
 * applyActivation rules on click; pointer and Space/Enter events are recorded separately for the feature extractor.
 */
export function ShapeMatchingSession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("shape-matching");
  const boardRef = useRef<HTMLDivElement>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [state, setState] = useState<MatchState>(EMPTY_MATCH_STATE);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = challenge.sources.length;
  const numbers = pairNumbers(state);
  const shapeName = (s: MatchShape): string => t(SHAPE_NAMES[s.shape][0], SHAPE_NAMES[s.shape][1]);
  const sourceIndexOf = (id: string): number => challenge.sources.findIndex((s) => s.id === id);
  const targetIndexOf = (id: string): number => challenge.targets.findIndex((s) => s.id === id);

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

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, target: string): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code !== "Space" && code !== "Enter") return;
    // A held key must not activate again: native buttons would click on every Enter repeat.
    if (e.repeat) e.preventDefault();
    else recorder.record({ type: "keydown", code, target });
  };

  const activate = (kind: "source" | "target", id: string): void => {
    setState((s) => applyActivation(s, { kind, id }, challenge).state);
    setCompleted(null); // a changed matching makes a shown result stale
    setError(null);
  };

  const onVerify = (): void => {
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { matches: answerFromState(challenge, state) }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
    } catch (err) {
      console.error("Shape matching submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const cellClass = (on: boolean, matched: boolean): string =>
    `relative h-20 w-20 touch-manipulation rounded-md border-2 bg-bg p-2 sm:h-24 sm:w-24 ${
      on ? "border-accent ring-2 ring-accent" : matched ? "border-accent" : "border-line hover:bg-track"
    }`;

  const badge = (n: number | undefined) =>
    n === undefined ? null : (
      <span
        aria-hidden="true"
        data-testid="pair-badge"
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-bg"
      >
        {n}
      </span>
    );

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted" data-testid="match-instruction">
          {t(
            "Chọn một hình nguồn, rồi chọn đích có cùng hình để ghép chúng. Chọn một đích đã ghép (khi chưa chọn hình nguồn nào) để gỡ ghép. Ghép đủ mọi hình rồi bấm Xác minh.",
            "Select a source shape, then the target with the same shape to match them. Select a matched target (with no source selected) to undo its match. Match every shape, then press Verify.",
          )}
        </p>
        <div ref={boardRef} data-testid="shape-matching" className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div role="group" aria-label={t("Hình nguồn", "Sources")} className="flex flex-wrap content-start justify-center gap-3">
            {challenge.sources.map((s, i) => {
              const on = state.selected === s.id;
              const matchedTarget = state.matches[s.id];
              const target = makeSourceTarget(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={sourceLabel(i, total, shapeName(s), matchedTarget === undefined ? null : targetIndexOf(matchedTarget), t)}
                  data-testid={`source-${s.id}`}
                  onPointerDown={(e) => recordPointer("pointerdown", e, target)}
                  onPointerUp={(e) => recordPointer("pointerup", e, target)}
                  onPointerCancel={(e) => recordPointer("pointercancel", e, target)}
                  onKeyDown={(e) => onKeyDown(e, target)}
                  onClick={() => activate("source", s.id)}
                  className={cellClass(on, matchedTarget !== undefined)}
                >
                  <ShapeGlyph shape={s.shape} rotation={s.rotation} filled={s.filled} scale={s.scale} />
                  {badge(numbers.bySource[s.id])}
                </button>
              );
            })}
          </div>
          <div role="group" aria-label={t("Đích", "Targets")} className="flex flex-wrap content-start justify-center gap-3">
            {challenge.targets.map((s, i) => {
              const owner = Object.entries(state.matches).find(([, tid]) => tid === s.id)?.[0];
              const target = makeTargetTarget(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={targetLabel(i, total, shapeName(s), owner === undefined ? null : sourceIndexOf(owner), t)}
                  data-testid={`target-${s.id}`}
                  onPointerDown={(e) => recordPointer("pointerdown", e, target)}
                  onPointerUp={(e) => recordPointer("pointerup", e, target)}
                  onPointerCancel={(e) => recordPointer("pointercancel", e, target)}
                  onKeyDown={(e) => onKeyDown(e, target)}
                  onClick={() => activate("target", s.id)}
                  className={cellClass(false, owner !== undefined)}
                >
                  <ShapeGlyph shape={s.shape} rotation={s.rotation} filled={s.filled} scale={s.scale} />
                  {badge(numbers.byTarget[s.id])}
                </button>
              );
            })}
          </div>
        </div>
        <p role="status" aria-live="polite" data-testid="match-status" className="mt-3 text-sm">
          {statusText(state, total, t)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="verify" onClick={onVerify} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
            {t("Xác minh", "Verify")}
          </button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: dùng phím Tab để tới một hình, rồi nhấn Enter hoặc Space để chọn. Nhãn của mỗi nút nêu tên hình nên không cần nhìn vẫn làm được; điều đó cũng khiến bản demo này rất dễ với phần mềm. Đây chỉ là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: press Tab to reach a shape, then Enter or Space to select it. Each button's label names its shape, so the task does not need sight; that also makes this demo trivial for software. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && (
        <ShapeMatchingInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
