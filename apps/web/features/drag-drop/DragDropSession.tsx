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
import { DragDropController, type DragDropViewState } from "./drag-drop-controller";
import { DragDropInspect } from "./DragDropInspect";
import { DragDropSurface } from "./DragDropSurface";
import { SHAPE_NAME } from "./shapes";

interface Completed {
  /** Increments per verification; keys the Inspect view so selection/replay never carry over. */
  submission: number;
  session: InteractionSession;
  layout: DragDropLayout;
  verification: VerificationResult;
  featureSet: FeatureSet<DragDropFeatures>;
  layoutChanged: boolean;
}

const INITIAL_VIEW: DragDropViewState = { ready: false, activeItemId: null, placements: {}, allPlaced: false, lastDrop: null };

interface Props {
  challenge: DragDropChallenge;
  onNewChallenge: () => void;
}

/**
 * One challenge = one session. The parent keys this component by challenge, so a new challenge remounts
 * it and drops the recorder, controller, placements, result, selection and replay with it.
 * Every drag in the session accumulates (Inspect shows all attempts); lifting an item clears a result.
 */
export function DragDropSession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const [challenge] = useState(initialChallenge); // pinned: drawn, verified and analyzed as one challenge
  const plugin = registry.get("drag-drop");
  const applyItemRef = useRef<(itemId: string, centerPx: Point) => void>(() => {});
  const submissionsRef = useRef(0);
  const resizedRef = useRef(false);
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
        if (s.activeItemId !== null) {
          setCompleted(null); // a held item means the old result no longer describes the board
          setError(null);
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
        } catch (err) {
          console.error("Drag & drop submission failed", err instanceof Error ? err.message : "unknown error");
          setError("Could not analyze this attempt. Start a new challenge.");
        }
      },
    });
  });

  const kindOf = (itemId: string) => challenge.items.find((i) => i.id === itemId)?.kind ?? "circle";
  const placedCount = Object.values(view.placements).filter((p) => p !== null).length;
  const drop = view.lastDrop;
  const bumped = drop?.bumpedItemId ? ` The ${SHAPE_NAME[kindOf(drop.bumpedItemId)].toLowerCase()} that was there went back.` : "";
  const dropText = drop
    ? drop.outcome === "correct"
      ? `${SHAPE_NAME[kindOf(drop.itemId)]}: placed on its matching drop area.${bumped}`
      : drop.outcome === "wrong-target"
        ? `${SHAPE_NAME[kindOf(drop.itemId)]}: placed on a drop area that is not its match.${bumped}`
        : `${SHAPE_NAME[kindOf(drop.itemId)]}: not on a drop area, so it went back.`
    : "";

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          Try
        </h2>
        <p className="mb-4 text-sm text-muted">
          Drag each shape onto the dashed area with the same outline. When all {challenge.items.length} shapes are
          placed, press Verify. A shape dropped away from any area goes back; one dropped on an occupied area sends the shape there back; you can drag a placed shape again.
        </p>
        <DragDropSurface challenge={challenge} controller={controller} view={view} applyItemRef={applyItemRef} />
        <p role="status" className="mt-3 min-h-5 text-sm" data-testid="drag-status">
          {view.ready ? `${placedCount} of ${challenge.items.length} shapes placed. ${dropText}` : "Measuring the board…"}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => controller.verify()}
            disabled={!view.allPlaced}
            data-testid="verify"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verify placement
          </button>
          <button
            type="button"
            onClick={onNewChallenge}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
          >
            New challenge
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Accessibility: this challenge needs a pointer (mouse, touch or pen) to drag. There is no keyboard
          alternative yet, so it is not accessible to keyboard-only or many assistive-technology users. Shapes and drop
          areas have text names, and state is given in words, not only color. This is a demonstration challenge and
          is not a substitute for an accessible production CAPTCHA.
        </p>
      </section>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      {completed && (
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
