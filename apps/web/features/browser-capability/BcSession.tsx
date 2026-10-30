"use client";

import { useState } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { BC_RUN_TARGET, computeLocal, probeCapability, registry, type BcAnswer, type BcCheckId, type BcChallenge, type BcFeatures } from "@captchalab/captcha-plugins";
import { ComputationInspect } from "@/components/inspect/ComputationInspect";
import { useT } from "@/lib/i18n";
import { useCellRecorder } from "@/lib/useCellRecorder";
import { bcMetrics, checkLabel } from "./bc-view-data";

interface Completed {
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<BcFeatures>;
  /** True or false per asked check, from this browser. The only environment data the page ever holds. */
  results: Readonly<Partial<Record<BcCheckId, boolean>>>;
  /** The small computation ran (the verifier separately recomputes and compares its result). */
  computed: boolean;
}

/**
 * One challenge = one session (the parent keys it by challenge). Nothing is checked until Run is pressed, and only
 * yes or no per API is kept: the page never creates a canvas, plays a sound or starts a worker, and stores nothing.
 */
export function BcSession({ challenge: initialChallenge, onNewChallenge }: { challenge: BcChallenge; onNewChallenge: () => void }) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("browser-capability");
  const { recorder, boardRef, handlers } = useCellRecorder(plugin.id);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (): void => {
    if (completed) return;
    try {
      const results: Partial<Record<BcCheckId, boolean>> = {};
      for (const id of challenge.checks) if (id !== "compute") results[id] = probeCapability(globalThis, id);
      const computed = challenge.checks.includes("compute") ? computeLocal(challenge.seed, challenge.workload) : undefined;
      const answer: BcAnswer = { checks: results, ...(computed === undefined ? {} : { computed }) };
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, answer, session);
      const supported = typeof verification.measurements?.supported === "number" ? verification.measurements.supported : null;
      const featureSet = plugin.extractFeatures(challenge, session, { supported });
      setCompleted({ session, verification, featureSet, results, computed: computed !== undefined });
    } catch (err) {
      console.error("Browser capability check failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không chạy được kiểm tra. Hãy bắt đầu thử thách mới.", "Could not run the checks. Start a new challenge."));
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">{t("Thử", "Try")}</h2>
        <p className="mb-2 text-sm text-muted" data-testid="bc-instruction">
          {t(
            `Trang sẽ hỏi trình duyệt ${challenge.checks.length} điều, mỗi điều chỉ trả lời có hoặc không, rồi chạy một phép tính nhỏ. Chỉ chạy khi bạn bấm.`,
            `The page asks the browser ${challenge.checks.length} things, each answered only yes or no, and runs a small computation. It only runs when you press the button.`,
          )}
        </p>
        <div ref={boardRef} role="group" aria-label={t("Điều khiển kiểm tra", "Check controls")} className="flex flex-wrap gap-3">
          <button type="button" data-testid="bc-run" disabled={completed !== null} onClick={run} {...handlers(BC_RUN_TARGET)} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50">
            {t("Chạy kiểm tra", "Run checks")}
          </button>
          <button type="button" data-testid="bc-new" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted" data-testid="bc-privacy">
          {t(
            "Đây không phải dấu vân tay thiết bị: chỉ có/không, không đọc giá trị nào, không lưu, không gửi đi và không tạo mã định danh.",
            "This is not a device fingerprint: yes or no only, no value is read, nothing is stored or sent, and no identifier is made.",
          )}
        </p>
      </section>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {completed && (
        <>
          <section aria-labelledby="checks-h" className="rounded-lg border border-line bg-panel p-4">
            <h2 id="checks-h" className="mb-2 text-base font-semibold">{t("Kết quả từng kiểm tra", "Result of each check")}</h2>
            <ul className="space-y-1 text-sm" data-testid="bc-checks">
              {challenge.checks.map((id) => {
                const ok = id === "compute" ? completed.computed : completed.results[id] === true;
                return (
                  <li key={id} data-testid={`bc-check-${id}`} data-available={ok ? "true" : "false"}>
                    {checkLabel(id, t)}: <span className="font-medium">{ok ? t("có", "available") : t("không có", "not available")}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <ComputationInspect
            verification={completed.verification}
            featureSet={completed.featureSet}
            session={completed.session}
            metrics={bcMetrics(completed.featureSet.features, t)}
            heading={t("Kiểm tra", "Checks")}
            disclaimer={t("Kiểm tra khả năng trình duyệt không chứng minh người dùng là con người: trình duyệt tự động cũng có đủ các API này.", "A browser capability check does not prove a human user: automated browsers offer these APIs too.")}
            eventsNote={t("Chỉ lần bấm Chạy kiểm tra được ghi lại.", "Only the press of Run checks is recorded.")}
          />
        </>
      )}
    </div>
  );
}
