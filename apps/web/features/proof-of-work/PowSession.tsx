"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { POW_CANCEL_TARGET, POW_START_TARGET, registry, type PowChallenge, type PowFeatures, type PowRun } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { PowInspect } from "./PowInspect";
import { createPowRunner, type PowFound, type PowRunner } from "./pow-runner";
import { powStatusText, type PowStatus } from "./pow-view-data";
import { useScopedId } from "@/lib/id-scope";

interface Completed {
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<PowFeatures>;
}

interface Props {
  challenge: PowChallenge;
  onNewChallenge: () => void;
  /** Called once when the run finished and was verified (used by the Hybrid lab). */
  onResult?: (result: { challengeId: string; passed: boolean }) => void;
}

/**
 * One challenge = one session (the parent keys it by challenge). Nothing runs until Start is pressed. The runner is
 * created per Start and disposed on Cancel and on unmount; `runIdRef` makes any late result from an old run harmless.
 * Only presses of the Start and Cancel buttons are recorded, never anything per hash.
 */
export function PowSession({ challenge: initialChallenge, onNewChallenge, onResult }: Props) {
  const sid = useScopedId();
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("proof-of-work");
  const boardRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<PowRunner | null>(null);
  const runIdRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [status, setStatus] = useState<PowStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      runIdRef.current += 1; // late hooks of any run are ignored
      runnerRef.current?.dispose();
      runnerRef.current = null;
    },
    [],
  );

  const record = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>, target: string): void => {
    const rect = boardRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (!sample) return;
    // A captured touch/pen release outside the button does not press it: record a cancel, not a press.
    const b = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    const recorded: PointerKind = kind === "pointerup" && !inside ? "pointercancel" : kind;
    recorder.record(toRecorderEvent(recorded, sample, target));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, target: string): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code !== "Space" && code !== "Enter") return;
    // A held key must not press again: native buttons would click on every Enter repeat.
    if (e.repeat) e.preventDefault();
    else recorder.record({ type: "keydown", code, target });
  };

  const finish = (runId: number, found: PowFound): void => {
    if (runId !== runIdRef.current) return;
    try {
      const run: PowRun = { nonce: found.nonce, iterations: found.iterations, computationMs: found.computationMs };
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { nonce: found.nonce }, session);
      const featureSet = plugin.extractFeatures(challenge, session, { run });
      setProgress(found.iterations);
      setCompleted({ session, verification, featureSet });
      setStatus("done");
      onResult?.({ challengeId: challenge.id, passed: verification.passed });
    } catch (err) {
      console.error("Proof of work analysis failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần chạy này. Hãy bắt đầu thử thách mới.", "Could not analyze this run. Start a new challenge."));
      setStatus("idle");
    }
    runnerRef.current = null;
  };

  const onStart = (): void => {
    if (runnerRef.current !== null || status === "running" || status === "done") return;
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setStatus("running");
    setProgress(0);
    setCompleted(null);
    setError(null);
    const runner = createPowRunner(challenge, {
      onProgress: (n) => {
        if (runId === runIdRef.current) setProgress(n);
      },
      onFound: (found) => finish(runId, found),
      onCancel: () => {
        if (runId === runIdRef.current) setStatus("cancelled");
      },
    });
    runnerRef.current = runner;
    runner.start();
  };

  const onCancel = (): void => {
    const runner = runnerRef.current;
    if (runner === null) return;
    runnerRef.current = null;
    runner.cancel(); // calls onCancel once, which sets "cancelled"
    runner.dispose();
  };

  const running = status === "running";
  const startLabel = t("Bắt đầu", "Start");
  const cancelLabel = t("Huỷ", "Cancel");

  return (
    <div className="space-y-6">
      <section aria-labelledby={sid("try-h")} className="rounded-lg border border-line bg-panel p-4">
        <h2 id={sid("try-h")} className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-2 text-sm text-muted" data-testid="pow-instruction">
          {t(
            "Tìm một số (nonce) sao cho mã băm SHA-256 của văn bản này đạt mức khó bên dưới. Phép tính chỉ chạy khi bạn bấm Bắt đầu.",
            "Find a number (a nonce) so that the SHA-256 hash of the text below meets the difficulty shown. Nothing runs until you press Start.",
          )}
        </p>
        <p className="mb-3 break-all font-mono text-sm" data-testid="pow-input">
          {challenge.input}:<span className="text-muted">nonce</span>
        </p>
        <div ref={boardRef} role="group" aria-label={t("Điều khiển phép tính", "Computation controls")} className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="pow-start"
            disabled={running || status === "done"}
            onClick={onStart}
            onPointerDown={(e) => record("pointerdown", e, POW_START_TARGET)}
            onPointerUp={(e) => record("pointerup", e, POW_START_TARGET)}
            onPointerCancel={(e) => record("pointercancel", e, POW_START_TARGET)}
            onKeyDown={(e) => onKeyDown(e, POW_START_TARGET)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50"
          >
            {startLabel}
          </button>
          <button
            type="button"
            data-testid="pow-cancel"
            disabled={!running}
            onClick={onCancel}
            onPointerDown={(e) => record("pointerdown", e, POW_CANCEL_TARGET)}
            onPointerUp={(e) => record("pointerup", e, POW_CANCEL_TARGET)}
            onPointerCancel={(e) => record("pointercancel", e, POW_CANCEL_TARGET)}
            onKeyDown={(e) => onKeyDown(e, POW_CANCEL_TARGET)}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p role="status" aria-live="polite" data-testid="pow-status" data-state={status}>
            {powStatusText(status, t)}
          </p>
          <p data-testid="pow-progress" aria-live="polite" aria-atomic="true" className="font-mono">
            {t("Số lần băm đã thử: ", "Hashes tried: ")}
            {progress.toLocaleString("en-US")}
          </p>
          {running && (
            <div role="progressbar" aria-label={t("Đang tính, chưa biết còn bao lâu", "Computing, time left unknown")} className="h-2 w-full overflow-hidden rounded bg-track">
              <div className="h-full w-1/3 animate-pulse rounded bg-accent" />
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted" data-testid="pow-note">
          {t(
            "Lưu ý: bằng chứng công việc không chứng minh người dùng là con người. Nó chỉ cho thấy phía máy khách đã bỏ ra công sức tính toán. Đây là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Note: proof of work does not prove the user is human. It only shows that the client spent computational effort. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && <PowInspect verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />}
    </div>
  );
}
