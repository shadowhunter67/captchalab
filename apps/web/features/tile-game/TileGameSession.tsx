"use client";

import { useRef, useState } from "react";
import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import { applyTileActivation, makeTileTarget, registry, type TileGameChallenge, type TileGameFeatures } from "@captchalab/captcha-plugins";
import { MatchGlyph } from "@/components/MatchGlyph";
import { SelectionInspect } from "@/components/inspect/SelectionInspect";
import { useT } from "@/lib/i18n";
import { useCellRecorder } from "@/lib/useCellRecorder";
import { instructionText, lookLabel, statusText, tileGameMetrics, tileLabel } from "./tile-game-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<TileGameFeatures>;
}

/**
 * One challenge = one session (the parent keys it by challenge). Tile buttons record pointer and Space/Enter events
 * and change the selection through the plugin's applyTileActivation, the rule the extractor replays.
 */
export function TileGameSession({ challenge: initialChallenge, onNewChallenge }: { challenge: TileGameChallenge; onNewChallenge: () => void }) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("tile-game");
  const { recorder, boardRef, handlers } = useCellRecorder(plugin.id);
  const submissionsRef = useRef(0);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activate = (id: string): void => {
    setSelected((s) => applyTileActivation(s, id, challenge.required).selected);
    setCompleted(null); // a changed selection makes a shown result stale
    setError(null);
  };

  const onVerify = (): void => {
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { selectedIds: selected }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
    } catch (err) {
      console.error("Tile Game submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const total = challenge.tiles.length;
  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">{t("Thử", "Try")}</h2>
        <p className="mb-4 text-sm text-muted" data-testid="tile-instruction">{instructionText(challenge, t)}</p>
        <div ref={boardRef} data-testid="tile-game" className="space-y-4">
          {challenge.reference && (
            <div className="flex items-center gap-4">
              <div role="img" aria-label={`${t("Ô mẫu", "Reference tile")}: ${lookLabel(challenge.reference, t)}`} data-testid="reference-tile" className="h-24 w-24 rounded-md border-2 border-dashed border-line bg-bg p-2">
                <MatchGlyph look={challenge.reference} />
              </div>
              <span className="text-sm text-muted">{t("Ô mẫu", "Reference tile")}</span>
            </div>
          )}
          <div role="group" aria-label={t("Các ô", "Tiles")} className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-4">
            {challenge.tiles.map((tile, i) => {
              const on = selected.includes(tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={tileLabel(tile, i, total, on, t)}
                  data-testid={`tile-${tile.id}`}
                  {...handlers(makeTileTarget(tile.id))}
                  onClick={() => activate(tile.id)}
                  className={`h-20 w-20 touch-manipulation rounded-md border-2 bg-bg p-2 sm:h-24 sm:w-24 ${on ? "border-accent ring-2 ring-accent" : "border-line hover:bg-track"}`}
                >
                  <MatchGlyph look={tile} scale={tile.scale} />
                </button>
              );
            })}
          </div>
        </div>
        <p role="status" aria-live="polite" data-testid="tile-status" className="mt-3 text-sm">{statusText(selected.length, challenge.required, t)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="verify" onClick={onVerify} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">{t("Xác minh", "Verify")}</button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">{t("Thử thách mới", "New challenge")}</button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: Tab để tới một ô, Enter hoặc Space để chọn hoặc bỏ chọn. Nhãn của ô nêu hình, họa tiết và hướng nên không cần nhìn vẫn làm được; điều đó cũng khiến bản demo này rất dễ với phần mềm. Đây chỉ là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: press Tab to reach a tile, then Enter or Space to select or clear it. Each tile's label names its shape, pattern and orientation, so the task does not need sight; that also makes this demo trivial for software. It is a demonstration, not a production CAPTCHA.",
          )}
        </p>
      </section>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {completed && (
        <SelectionInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} metrics={tileGameMetrics(completed.featureSet.features, t)} heading={t("Trò chơi ô", "Tile Game")} />
      )}
    </div>
  );
}
