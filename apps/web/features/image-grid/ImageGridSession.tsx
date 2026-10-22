"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { GRID_SIZE, makeCellTarget, registry, type ImageGridChallenge, type ImageGridFeatures } from "@captchalab/captcha-plugins";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { ImageGridInspect } from "./ImageGridInspect";
import { ImageGridTile } from "./ImageGridTile";
import { moveFocus, toggleCell } from "./image-grid-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<ImageGridFeatures>;
}

interface Props {
  challenge: ImageGridChallenge;
  onNewChallenge: () => void;
}

/**
 * One challenge = one session (the parent keys it by challenge). Each tile is a native toggle button
 * (aria-pressed): the browser's click decides the selection, while pointer and Space/Enter events are
 * recorded separately. Arrow keys only move focus and are not recorded.
 */
export function ImageGridSession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const [challenge] = useState(initialChallenge);
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
    } catch (err) {
      console.error("Image grid submission failed", err instanceof Error ? err.message : "unknown error");
      setError("Could not analyze this attempt. Start a new challenge.");
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          Try
        </h2>
        <p className="mb-4 text-sm text-muted" data-testid="grid-instruction">
          Select every image that shows a <strong>{challenge.target}</strong>, then press Verify.
        </p>
        <div
          ref={gridRef}
          role="group"
          aria-label={`Image grid: select every ${challenge.target}`}
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
                aria-label={`Image ${i + 1} of ${challenge.cells.length}: ${cell.shape}`}
                data-testid={`cell-${cell.id}`}
                onPointerDown={(e) => recordPointer("pointerdown", e, cell.id)}
                onPointerUp={(e) => recordPointer("pointerup", e, cell.id)}
                onPointerCancel={(e) => recordPointer("pointercancel", e, cell.id)}
                onKeyDown={(e) => onKeyDown(e, i, cell.id)}
                onClick={() => {
                  setSelected((s) => toggleCell(s, cell.id));
                  setCompleted(null); // a changed selection makes a shown result stale
                  setError(null);
                }}
                className={`h-20 w-20 touch-manipulation rounded-md border-2 bg-bg p-2 sm:h-24 sm:w-24 ${
                  on ? "border-accent ring-2 ring-accent" : "border-line hover:bg-track"
                }`}
              >
                <ImageGridTile shape={cell.shape} />
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" data-testid="verify" onClick={onVerify} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
            Verify
          </button>
          <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            New challenge
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Accessibility: every image is a toggle button reachable with Tab, arrow keys move between them, and Space or
          Enter toggles. Each button&apos;s label names its shape, so the task does not need sight; that also makes this
          demo trivial for software. It is a demonstration, not a production CAPTCHA.
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && (
        <ImageGridInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />
      )}
    </div>
  );
}
