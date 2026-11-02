"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import Link from "next/link";
import { GRID_SIZE, isArtCategory, makeCellTarget, registry, type ImageGridChallenge, type ImageGridFeatures } from "@captchalab/captcha-plugins";
import { artLabel } from "@/lib/art/names";
import { useT } from "@/lib/i18n";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { ImageGridInspect } from "./ImageGridInspect";
import type { SessionReport } from "@/lib/behavior/human";
import { ImageGridTile } from "./ImageGridTile";
import { moveFocus, toggleCell } from "./image-grid-view-data";

const SHAPE_VI: Record<string, string> = {
  circle: "hình tròn",
  square: "hình vuông",
  triangle: "hình tam giác",
  star: "hình ngôi sao",
  oval: "hình bầu dục",
  rounded: "hình vuông bo góc",
};

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<ImageGridFeatures>;
}

interface Props {
  challenge: ImageGridChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session (the parent keys it by challenge). Each tile is a native toggle button
 * (aria-pressed): the browser's click decides the selection, while pointer and Space/Enter events are
 * recorded separately. Arrow keys only move focus and are not recorded.
 */
export function ImageGridSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const shapeName = (s: string): string => (isArtCategory(s) ? artLabel(s, t) : t(SHAPE_VI[s] ?? s, s));
  const [challenge] = useState(initialChallenge);
  /** Picture variants: tiles are illustrations, so their accessible name is only "Image N of 9" (the answer is not in the name). */
  const pictures = isArtCategory(challenge.target);
  const targetName = shapeName(challenge.target);
  const article = /^[aeiou]/i.test(artLabel(isArtCategory(challenge.target) ? challenge.target : "cat", (_vi, en) => en)) ? "an" : "a";
  const plugin = registry.get("image-grid");
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [selected, setSelected] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordPointer = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>, cellId: string): void => {
    const rect = gridRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (!sample) return;
    // A captured touch/pen release outside the tile does not click it: record a cancel, not a toggle.
    const b = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    const recorded: PointerKind = kind === "pointerup" && !inside ? "pointercancel" : kind;
    recorder.record(toRecorderEvent(recorded, sample, makeCellTarget(cellId)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number, cellId: string): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code === "Space" || code === "Enter") {
      // A held key must not toggle again: native buttons would click on every Enter repeat.
      if (e.repeat) e.preventDefault();
      else recorder.record({ type: "keydown", code, target: makeCellTarget(cellId) });
      return;
    }
    const next = moveFocus(index, e.key, GRID_SIZE);
    if (next !== null) {
      e.preventDefault();
      cellRefs.current[next]?.focus();
    }
  };

  const onVerify = (): void => {
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { selected }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
      onResult?.({ session, context: undefined, passed: verification.passed });
    } catch (err) {
      console.error("Image grid submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="cl-widget rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted" data-testid="grid-instruction">
          {pictures ? t("Chọn tất cả ảnh có ", `Select all images with ${article} `) : t("Chọn mọi ảnh có ", "Select every image that shows a ")}
          <strong>{targetName}</strong>
          {pictures ? t(".", ".") : t(", rồi bấm Xác minh.", ", then press Verify.")}
        </p>
        <div
          ref={gridRef}
          role="group"
          aria-label={t(`Lưới ảnh: chọn mọi ${shapeName(challenge.target)}`, `Image grid: select every ${challenge.target}`)}
          data-testid="image-grid"
          className="grid w-fit grid-cols-3 gap-2"
        >
          {challenge.cells.map((cell, i) => {
            const on = selected.includes(cell.id);
            return (
              <button
                key={cell.id}
                ref={(el) => {
                  cellRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={on}
                aria-label={
                  pictures
                    ? t(`Ảnh ${i + 1} trên ${challenge.cells.length}`, `Image ${i + 1} of ${challenge.cells.length}`)
                    : t(`Ảnh ${i + 1} trên ${challenge.cells.length}: ${shapeName(cell.shape)}`, `Image ${i + 1} of ${challenge.cells.length}: ${cell.shape}`)
                }
                data-testid={`cell-${cell.id}`}
                onPointerDown={(e) => recordPointer("pointerdown", e, cell.id)}
                onPointerUp={(e) => recordPointer("pointerup", e, cell.id)}
                onPointerCancel={(e) => recordPointer("pointercancel", e, cell.id)}
                onKeyDown={(e) => onKeyDown(e, i, cell.id)}
                onClick={() => {
                  setSelected((s) => toggleCell(s, cell.id));
                  setCompleted(null); // a changed selection makes a shown result stale
                  setError(null);
                  onReset?.();
                }}
                className={`relative touch-manipulation overflow-hidden rounded-md border-2 bg-bg ${pictures ? "h-[5.5rem] w-[5.5rem] p-0 sm:h-28 sm:w-28" : "h-20 w-20 p-2 sm:h-24 sm:w-24"} ${
                  on ? "border-accent ring-2 ring-accent" : "border-line hover:bg-track"
                }`}
              >
                <ImageGridTile cell={cell} />
                {pictures && on && (
                  <span aria-hidden="true" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-sm font-bold text-bg">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="verify" onClick={onVerify} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
            {t("Xác minh", "Verify")}
          </button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            {t("Thử thách mới", "New challenge")}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          {pictures
            ? t(
                "Khả năng tiếp cận: mỗi ảnh là một nút bật/tắt (Tab, mũi tên, Space hoặc Enter), nhưng tên nút chỉ là số thứ tự và ảnh không có chú thích: lời giải không được nói ra trong tên nút, nên người không nhìn được không làm được thử thách này. Hãy dùng thử thách thay thế bằng âm thanh. Đây chỉ là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
                "Accessibility: every image is a toggle button (Tab, arrow keys, Space or Enter), but its name is only its number and the pictures have no captions: the answer is not spoken in the name, so people who cannot see the pictures cannot do this challenge. Use the audio challenge instead. It is a demonstration, not a production CAPTCHA.",
              )
            : t(
            "Khả năng tiếp cận: mỗi ảnh là một nút bật/tắt, dùng phím Tab để tới, phím mũi tên để di chuyển giữa các ảnh, và phím Space hoặc Enter để bật/tắt. Nhãn của mỗi nút nêu tên hình nên không cần nhìn vẫn làm được; điều đó cũng khiến bản demo này rất dễ với phần mềm. Đây chỉ là bản minh hoạ, không phải CAPTCHA dùng cho sản phẩm thật.",
            "Accessibility: every image is a toggle button reachable with Tab, arrow keys move between them, and Space or Enter toggles. Each button's label names its shape, so the task does not need sight; that also makes this demo trivial for software. It is a demonstration, not a production CAPTCHA.",
          )}
          {pictures && (
            <>
              {" "}
              <Link href="/playground/audio" data-testid="grid-alternative" className="underline">
                {t("Thử thách thay thế (âm thanh)", "Alternative challenge (audio)")}
              </Link>
            </>
          )}
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && showInspect && (
        <ImageGridInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
