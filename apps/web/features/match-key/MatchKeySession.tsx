"use client";

import { useRef, useState } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { applyOptionActivation, makeMatchOptionTarget, registry, type MatchKeyChallenge, type MatchKeyFeatures } from "@captchalab/captcha-plugins";
import { MatchGlyph } from "@/components/MatchGlyph";
import { SelectionInspect } from "@/components/inspect/SelectionInspect";
import { useT } from "@/lib/i18n";
import { useCellRecorder } from "@/lib/useCellRecorder";
import { lookLabel, matchKeyMetrics, ruleText } from "./match-key-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<MatchKeyFeatures>;
}

/**
 * One challenge = one session (the parent keys it by challenge). Option buttons record pointer and Space/Enter events
 * and change the selection through the plugin's applyOptionActivation, the rule the extractor replays.
 */
export function MatchKeySession({ challenge: initialChallenge, onNewChallenge }: { challenge: MatchKeyChallenge; onNewChallenge: () => void }) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("match-key");
  const { recorder, boardRef, handlers } = useCellRecorder(plugin.id);
  const submissionsRef = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activate = (id: string): void => {
    setSelected((s) => applyOptionActivation(s, id).selected);
    setCompleted(null); // a changed selection makes a shown result stale
    setError(null);
  };

  const onVerify = (): void => {
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { selectedId: selected }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
    } catch (err) {
      console.error("MatchKey submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const total = challenge.options.length;
  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">{t("Thử", "Try")}</h2>
        <p className="mb-4 text-sm text-muted" data-testid="match-instruction">{ruleText(challenge.keyAttrs, t)}</p>
        <div ref={boardRef} data-testid="match-key" className="space-y-4">
          <div className="flex items-center gap-4">
            <div role="img" aria-label={`${t("Hình mẫu", "Key")}: ${lookLabel(challenge.reference, t)}`} data-testid="key-glyph" className="h-24 w-24 rounded-md border-2 border-dashed border-line bg-bg p-2">
              <MatchGlyph look={challenge.reference} />
            </div>
            <span className="text-sm text-muted">{t("Hình mẫu", "Key")}</span>
          </div>
          <div role="group" aria-label={t("Các lựa chọn", "Options")} className="flex flex-wrap gap-3">
            {challenge.options.map((o, i) => {
              const on = selected === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={t(`Lựa chọn ${i + 1} trên ${total}: ${lookLabel(o, t)}`, `Option ${i + 1} of ${total}: ${lookLabel(o, t)}`)}
                  data-testid={`option-${o.id}`}
                  {...handlers(makeMatchOptionTarget(o.id))}
                  onClick={() => activate(o.id)}
                  className={`h-20 w-20 touch-manipulation rounded-md border-2 bg-bg p-2 sm:h-24 sm:w-24 ${on ? "border-accent ring-2 ring-accent" : "border-line hover:bg-track"}`}
                >
                  <MatchGlyph look={o} scale={o.scale} />
                </button>
              );
            })}
          </div>
        </div>
        <p role="status" aria-live="polite" data-testid="match-status" className="mt-3 text-sm">
          {selected === null ? t("Chưa chọn lựa chọn nào", "No option selected") : t("Đã chọn một lựa chọn", "One option selected")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="verify" onClick={onVerify} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">{t("Xác minh", "Verify")}</button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">{t("Thử thách mới", "New challenge")}</button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: Tab để tới một lựa chọn, Enter hoặc Space để chọn. Nhãn của nút nêu hình, họa tiết và hướng nên không cần nhìn vẫn làm được; điều đó cũng khiến bản demo này rất dễ với phần mềm. Đây chỉ là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: press Tab to reach an option, then Enter or Space to select it. Each button's label names its shape, pattern and orientation, so the task does not need sight; that also makes this demo trivial for software. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {completed && (
        <SelectionInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} metrics={matchKeyMetrics(completed.featureSet.features, t)} heading="MatchKey" />
      )}
    </div>
  );
}
