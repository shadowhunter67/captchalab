"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { POS_CANCEL_TARGET, POS_START_TARGET, registry, type PosChallenge, type PosFeatures } from "@captchalab/captcha-plugins";
import { ComputationInspect } from "@/components/inspect/ComputationInspect";
import { useT } from "@/lib/i18n";
import { useCellRecorder } from "@/lib/useCellRecorder";
import { createPosRunner, type PosDone, type PosRunner } from "./pos-runner";
import { formatBytes, posMetrics, posStatusText, type PosStatus } from "./pos-view-data";

interface Completed {
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<PosFeatures>;
}

/**
 * One challenge = one session (the parent keys it by challenge). Nothing runs until Start is pressed. The runner is
 * created per Start and disposed on Cancel and on unmount (which also frees its buffer); `runIdRef` makes any late
 * result from an old run harmless. Only presses of Start and Cancel are recorded, never anything per byte.
 */
export function PosSession({ challenge: initialChallenge, onNewChallenge }: { challenge: PosChallenge; onNewChallenge: () => void }) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("proof-of-space");
  const { recorder, boardRef, handlers } = useCellRecorder(plugin.id);
  const runnerRef = useRef<PosRunner | null>(null);
  const runIdRef = useRef(0);
  const [status, setStatus] = useState<PosStatus>("idle");
  const [filled, setFilled] = useState(0);
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

  const finish = (runId: number, done: PosDone): void => {
    if (runId !== runIdRef.current) return;
    try {
      const session = recorder.snapshot();
      const v0 = performance.now();
      const verification = plugin.verify(challenge, done.proof, session);
      const verificationMs = performance.now() - v0;
      const featureSet = plugin.extractFeatures(challenge, session, { run: done.run, verificationMs });
      setFilled(challenge.bytes);
      setCompleted({ session, verification, featureSet });
      setStatus("done");
    } catch (err) {
      console.error("Proof of space analysis failed", err instanceof Error ? err.message : "unknown error");
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
    setFilled(0);
    setCompleted(null);
    setError(null);
    const runner = createPosRunner(challenge, {
      onProgress: (n) => {
        if (runId === runIdRef.current) setFilled(n);
      },
      onDone: (done) => finish(runId, done),
      onCancel: () => {
        if (runId === runIdRef.current) setStatus("cancelled");
      },
      onError: () => {
        if (runId === runIdRef.current) {
          runnerRef.current = null;
          setStatus("error");
        }
      },
    });
    runnerRef.current = runner;
    runner.start();
  };

  const onCancel = (): void => {
    const runner = runnerRef.current;
    if (runner === null) return;
    runnerRef.current = null;
    runner.cancel(); // calls onCancel once, which sets "cancelled"; the buffer is released
    runner.dispose();
  };

  const running = status === "running";
  const pct = Math.min(100, Math.round((filled / challenge.bytes) * 100));
  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">{t("Thử", "Try")}</h2>
        <p className="mb-2 text-sm text-muted" data-testid="pos-instruction">
          {challenge.kind === "sample"
            ? t(
                `Trình duyệt sẽ điền một vùng nhớ ${formatBytes(challenge.bytes)} theo cách xác định rồi báo lại giá trị của ${challenge.sampleCount} byte do thử thách chọn. Chỉ chạy khi bạn bấm Bắt đầu.`,
                `The browser fills a ${formatBytes(challenge.bytes)} memory region deterministically and reports ${challenge.sampleCount} bytes the challenge picks. It only runs when you press Start.`,
              )
            : t(
                `Trình duyệt sẽ điền một vùng nhớ ${formatBytes(challenge.bytes)} theo cách xác định rồi báo lại mã kiểm tra của toàn bộ vùng. Chỉ chạy khi bạn bấm Bắt đầu.`,
                `The browser fills a ${formatBytes(challenge.bytes)} memory region deterministically and reports a checksum of all of it. It only runs when you press Start.`,
              )}
        </p>
        <div ref={boardRef} role="group" aria-label={t("Điều khiển phép tính", "Computation controls")} className="flex flex-wrap gap-3">
          <button type="button" data-testid="pos-start" disabled={running || status === "done"} onClick={onStart} {...handlers(POS_START_TARGET)} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50">
            {t("Bắt đầu", "Start")}
          </button>
          <button type="button" data-testid="pos-cancel" disabled={!running} onClick={onCancel} {...handlers(POS_CANCEL_TARGET)} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:opacity-50">
            {t("Huỷ", "Cancel")}
          </button>
          <button type="button" data-testid="pos-new" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p data-testid="pos-status" data-state={status}>{posStatusText(status, t)}</p>
          <p data-testid="pos-progress" aria-live="polite" aria-atomic="true" className="font-mono">
            {t("Đã điền: ", "Filled: ")}{formatBytes(filled)} / {formatBytes(challenge.bytes)}
          </p>
          {running && (
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("Tiến độ điền bộ nhớ", "Memory fill progress")} className="h-2 w-full overflow-hidden rounded bg-track">
              <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted" data-testid="pos-note">
          {t(
            "Lưu ý: bằng chứng không gian không chứng minh người dùng là con người. Đây là mô phỏng giáo dục, không phải giao thức lưu trữ mật mã thật, và không phải CAPTCHA dùng cho sản phẩm thật.",
            "Note: Proof-of-Space does not prove a human user. This is an educational simulation, not a real storage-hard cryptographic protocol, and not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {completed && (
        <ComputationInspect
          verification={completed.verification}
          featureSet={completed.featureSet}
          session={completed.session}
          metrics={posMetrics(completed.featureSet.features, t)}
          heading={t("Phép tính", "Computation")}
          disclaimer={t("Bằng chứng không gian không chứng minh người dùng là con người: nó chỉ cho thấy thiết bị đã dùng bộ nhớ và thời gian.", "Proof-of-Space does not prove a human user: it only shows that a device used memory and time.")}
          eventsNote={t("Chỉ các lần bấm Bắt đầu và Huỷ được ghi lại; cố ý không ghi một sự kiện cho mỗi thao tác bộ nhớ.", "Only Start and Cancel presses are recorded; one event per memory operation is deliberately not recorded.")}
        />
      )}
      {status === "error" && <p role="alert" className="text-sm text-bad">{posStatusText("error", t)}</p>}
    </div>
  );
}
