"use client";

import { useRef, useState } from "react";
import {
  createEventRecorder,
  type FeatureSet,
  type InteractionSession,
  type Point,
  type VerificationResult,
} from "@captchalab/captcha-core";
import {
  registry,
  type DragDropChallenge,
  type DragDropFeatures,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { DragDropController, type DragDropViewState } from "./drag-drop-controller";
import { DragDropInspect } from "./DragDropInspect";
import type { SessionReport } from "@/lib/behavior/human";
import { DragDropSurface } from "./DragDropSurface";
import { shapeName, shapeNameLower } from "./shapes";

interface Completed {
  /** Increments per verification; keys the Inspect view so selection/replay never carry over. */
  submission: number;
  session: InteractionSession;
  layout: DragDropLayout;
  verification: VerificationResult;
  featureSet: FeatureSet<DragDropFeatures>;
  layoutChanged: boolean;
}

const INITIAL_VIEW: DragDropViewState = { ready: false, activeItemId: null, selectedItemId: null, keyNotice: null, placements: {}, allPlaced: false, lastDrop: null };

interface Props {
  challenge: DragDropChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session. The parent keys this component by challenge, so a new challenge remounts
 * it and drops the recorder, controller, placements, result, selection and replay with it.
 * Every drag in the session accumulates (Inspect shows all attempts); lifting an item clears a result.
 */
export function DragDropSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const [challenge] = useState(initialChallenge); // pinned: drawn, verified and analyzed as one challenge
  const plugin = registry.get("drag-drop");
  const applyItemRef = useRef<(itemId: string, centerPx: Point) => void>(() => {});
  const submissionsRef = useRef(0);
  const resizedRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;
  const [view, setView] = useState<DragDropViewState>(INITIAL_VIEW);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [controller] = useState(() => {
    // Raw events go to the recorder buffer only; React state sees coarse state and the final result.
    const recorder = createEventRecorder({ captchaId: plugin.id });
    return new DragDropController({
      recorder,
      challenge,
      onItemPosition: (id, c) => applyItemRef.current(id, c),
      onLayoutChangedAfterInput: () => {
        resizedRef.current = true;
      },
      onState: (s) => {
        setView(s);
        if (s.activeItemId !== null || s.selectedItemId !== null) {
          setCompleted(null); // a held or selected item means the old result no longer describes the board
          setError(null);
          onResetRef.current?.();
        }
      },
      onVerify: (answer, layout) => {
        try {
          const session = recorder.snapshot();
          // Correctness and behavior are computed independently by the plugin.
          const verification = plugin.verify(challenge, answer, session);
          const featureSet = plugin.extractFeatures(challenge, session, { layout });
          submissionsRef.current += 1;
          setCompleted({
            submission: submissionsRef.current,
            session,
            layout,
            verification,
            featureSet,
            layoutChanged: resizedRef.current,
          });
          setError(null);
          onResultRef.current?.({ session, context: layout, passed: verification.passed });
        } catch (err) {
          console.error("Drag & drop submission failed", err instanceof Error ? err.message : "unknown error");
          setError(tRef.current("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
        }
      },
    });
  });

  const kindOf = (itemId: string) => challenge.items.find((i) => i.id === itemId)?.kind ?? "circle";
  const placedCount = Object.values(view.placements).filter((p) => p !== null).length;
  const drop = view.lastDrop;
  const bumped = drop?.bumpedItemId
    ? t(
        ` ${shapeName(kindOf(drop.bumpedItemId), t)} đang ở đó đã quay về.`,
        ` The ${shapeNameLower(kindOf(drop.bumpedItemId))} that was there went back.`,
      )
    : "";
  const dropText = drop
    ? drop.outcome === "correct"
      ? `${shapeName(kindOf(drop.itemId), t)}: ${t("đã đặt vào vùng thả đúng của nó.", "placed on its matching drop area.")}${bumped}`
      : drop.outcome === "wrong-target"
        ? `${shapeName(kindOf(drop.itemId), t)}: ${t("đã đặt vào một vùng thả không phải của nó.", "placed on a drop area that is not its match.")}${bumped}`
        : `${shapeName(kindOf(drop.itemId), t)}: ${t("không nằm trên vùng thả nào nên đã quay về.", "not on a drop area, so it went back.")}`
    : "";

  const selectedText =
    view.selectedItemId !== null
      ? t(`Đã chọn: ${shapeName(kindOf(view.selectedItemId), t)}. Hãy chọn một vùng thả (Enter hoặc Space), hoặc nhấn Escape để bỏ chọn.`, `Selected: ${shapeName(kindOf(view.selectedItemId), t)}. Choose a drop area (Enter or Space), or press Escape to unselect.`)
      : view.keyNotice === "deselected"
        ? t("Đã bỏ chọn.", "Selection cancelled.")
        : view.keyNotice === "needs-selection"
          ? t("Hãy chọn một hình trước (Enter hoặc Space), rồi chọn vùng thả.", "Select a shape first (Enter or Space), then choose a drop area.")
          : "";

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            `Kéo từng hình vào vùng nét đứt có cùng đường viền; hoặc dùng bàn phím: Tab tới một hình, nhấn Enter hoặc Space để chọn, Tab tới vùng thả rồi nhấn Enter hoặc Space để đặt (Escape để bỏ chọn). Khi cả ${challenge.items.length} hình đã được đặt, hãy nhấn Xác minh. Hình thả ra ngoài mọi vùng sẽ quay về; đặt vào vùng đã có hình sẽ đẩy hình đang ở đó về chỗ cũ; bạn có thể chọn hoặc kéo lại hình đã đặt để sửa.`,
            `Drag each shape onto the dashed area with the same outline; or use the keyboard: Tab to a shape, press Enter or Space to select it, Tab to a drop area and press Enter or Space to place it (Escape unselects). When all ${challenge.items.length} shapes are placed, press Verify. A shape dropped away from any area goes back; placing on an occupied area sends the shape there back; you can select or drag a placed shape again to correct it.`,
          )}
        </p>
        <DragDropSurface challenge={challenge} controller={controller} view={view} applyItemRef={applyItemRef} />
        <p role="status" className="mt-3 min-h-5 text-sm" data-testid="drag-status">
          {view.ready
            ? t(
                `Đã đặt ${placedCount}/${challenge.items.length} hình. ${selectedText || dropText}`,
                `${placedCount} of ${challenge.items.length} shapes placed. ${selectedText || dropText}`,
              )
            : t("Đang đo bảng…", "Measuring the board…")}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => controller.verify()}
            disabled={!view.allPlaced}
            data-testid="verify"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("Xác minh vị trí", "Verify placement")}
          </button>
          <button
            type="button"
            onClick={onNewChallenge}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
          >
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            "Khả năng tiếp cận: có thể kéo bằng con trỏ (chuột, cảm ứng hoặc bút) hoặc hoàn thành chỉ bằng bàn phím (chọn hình rồi chọn vùng thả). Các hình và vùng thả có tên bằng chữ, và trạng thái được nêu bằng lời chứ không chỉ bằng màu. Cách dùng bàn phím chưa được kiểm tra với mọi trình đọc màn hình. Đây là thử thách minh họa, không thay thế được một CAPTCHA thực tế có khả năng tiếp cận tốt.",
            "Accessibility: you can drag with a pointer (mouse, touch or pen) or finish with the keyboard alone (select a shape, then choose a drop area). Shapes and drop areas have text names, and state is given in words, not only color. The keyboard flow has not been checked with every screen reader. This is a demonstration challenge and is not a substitute for an accessible production CAPTCHA.",
          )}
        </p>
      </section>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {completed && showInspect && (
        <DragDropInspect
          key={completed.submission}
          challenge={challenge}
          verification={completed.verification}
          featureSet={completed.featureSet}
          session={completed.session}
          layout={completed.layout}
          layoutChanged={completed.layoutChanged}
        />
      )}
    </div>
  );
}
