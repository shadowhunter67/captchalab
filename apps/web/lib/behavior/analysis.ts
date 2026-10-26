import {
  extractGestures,
  gestureTrack,
  isKeyEvent,
  isPointerEvent,
  pathLength,
  type InteractionSession,
  type Point,
  type TimedPoint,
} from "@captchalab/captcha-core";
import {
  TEXT_TARGET,
  deriveDragAttempts,
  deriveRotation,
  extractCheckboxActivations,
  extractToggles,
  isCharacterKey,
  registry,
  type DragDropChallenge,
  type DragDropFeatures,
  type DragDropLayout,
  type ImageGridChallenge,
  type ImageGridFeatures,
  type RotationChallenge,
  type RotationFeatures,
  type SliderChallenge,
  type SliderFeatures,
  type SliderLayout,
  type TextChallenge,
  type TextFeatures,
  type CheckboxChallenge,
  type CheckboxFeatures,
} from "@captchalab/captcha-plugins";
import { cv, gaps, reversals } from "./stats";
import {
  BEHAVIOR_FEATURE_SET,
  type BehaviorCaptchaId,
  type BehaviorContext,
  type BehavioralVector,
  type LabTaskId,
  type SignalValues,
} from "./types";

/** Gaps longer than this between selections or character keys count as a pause. */
export const PAUSE_MS = 1000;

/** One track per press-and-release (hover before the press is not part of it). */
function gestureTracks(session: InteractionSession): TimedPoint[][] {
  return extractGestures(session).map((g) => gestureTrack(g.events)).filter((t) => t.length >= 2);
}

interface PointerShape {
  speedCv: number | null;
  straightness: number | null;
  sampleIntervalCv: number | null;
}

/**
 * Speeds and sample intervals between CONSECUTIVE pointermove events of one pointer. The press, the hold before
 * the first move and the release are left out on purpose: a pause there says nothing about how the pointer moved.
 */
export function moveSegments(session: InteractionSession): { speeds: number[]; intervals: number[] } {
  const speeds: number[] = [];
  const intervals: number[] = [];
  let prev: InteractionSession["events"][number] | undefined;
  for (const e of session.events) {
    if (isPointerEvent(e) && e.type === "pointermove" && prev && isPointerEvent(prev) && prev.type === "pointermove" && prev.pointerId === e.pointerId) {
      const dt = e.t - prev.t;
      if (dt > 0) {
        intervals.push(dt);
        speeds.push((Math.hypot(e.x - prev.x, e.y - prev.y) / dt) * 1000);
      }
    }
    prev = e;
  }
  return { speeds, intervals };
}

/** Variation of speed, how straight the path is and how regular the sampling is. */
function pointerShape(session: InteractionSession, tracks: readonly (readonly TimedPoint[])[]): PointerShape {
  const { speeds, intervals } = moveSegments(session);
  let chord = 0;
  let path = 0;
  for (const t of tracks) {
    const first = t[0] as Point;
    const last = t[t.length - 1] as Point;
    chord += Math.hypot(last.x - first.x, last.y - first.y);
    path += pathLength(t);
  }
  return {
    speedCv: cv(speeds, 5),
    straightness: path > 0 ? Math.min(1, chord / path) : null,
    sampleIntervalCv: cv(intervals, 5),
  };
}

export interface BehaviorExtraction {
  /** Plugin feature schema, e.g. "slider@1". */
  sourceSchema: string;
  values: SignalValues;
}

/** Slider layout when none is known (same default the synthetic generator uses). */
export const DEFAULT_SLIDER_LAYOUT: SliderLayout = { trackLeft: 0, trackWidth: 320, handleWidth: 44 };
export const DEFAULT_DRAG_LAYOUT: DragDropLayout = { width: 480, height: 320 };
export const DEFAULT_ROTATION_CENTER: Point = { x: 120, y: 120 };

/**
 * Runs the plugin's own extractor, then derives the few extra signals the lab needs from the SAME session
 * (rhythm and variation). Pure; never reads raw coordinates out of this function: only numbers leave it.
 * `challenge` is typed per CAPTCHA by the caller (see tasks.ts); it is the challenge the session was made on.
 */
export function extractSignals(captchaId: BehaviorCaptchaId, challenge: unknown, session: InteractionSession, context: BehaviorContext): BehaviorExtraction {
  switch (captchaId) {
    case "slider": {
      const layout = (context as SliderLayout | undefined) ?? DEFAULT_SLIDER_LAYOUT;
      const set = registry.get("slider").extractFeatures(challenge as SliderChallenge, session, { layout });
      const f: SliderFeatures = set.features;
      const tracks = gestureTracks(session);
      const shape = pointerShape(session, tracks);
      const corrections = tracks.reduce((n, tr) => n + reversals(tr.slice(1).map((p, i) => p.x - (tr[i] as TimedPoint).x), 0.5), 0);
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          completionTime: f.completionTime,
          pointerDistance: f.pointerDistance,
          meanVelocity: f.meanVelocity,
          maxVelocity: f.maxVelocity,
          speedCv: shape.speedCv,
          maxAcceleration: f.maxAcceleration,
          straightness: shape.straightness,
          directionChanges: f.directionChanges,
          corrections,
          overshoot: f.overshoot,
          releaseError: f.releaseError,
          sampleIntervalCv: shape.sampleIntervalCv,
          attemptCount: f.numberOfAttempts,
        },
      };
    }
    case "drag-drop": {
      const layout = (context as DragDropLayout | undefined) ?? DEFAULT_DRAG_LAYOUT;
      const ch = challenge as DragDropChallenge;
      const set = registry.get("drag-drop").extractFeatures(ch, session, { layout });
      const f: DragDropFeatures = set.features;
      const attempts = deriveDragAttempts(ch, layout, session).attempts;
      const tracks = attempts.map((a) => [...a.track]).filter((t) => t.length >= 2);
      const shape = pointerShape(session, tracks);
      const durations = attempts.map((a) => a.endT - a.startT);
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          completionTime: f.completionTime,
          dragDurationMean: f.meanDragDuration,
          pointerDistance: f.totalDragDistance,
          meanVelocity: f.totalDragDuration && f.totalDragDuration > 0 && f.totalDragDistance !== null ? (f.totalDragDistance / f.totalDragDuration) * 1000 : null,
          speedCv: shape.speedCv,
          straightness: shape.straightness,
          directionChanges: f.directionChanges,
          releaseError: f.meanReleaseError,
          dragDurationCv: cv(durations, 3),
          sampleIntervalCv: shape.sampleIntervalCv,
          attemptCount: f.numberOfDragAttempts,
          failedDropCount: f.failedDropCount,
          cancelledDragCount: f.cancelledDragCount,
        },
      };
    }
    case "checkbox": {
      const set = registry.get("checkbox").extractFeatures(challenge as CheckboxChallenge, session);
      const f: CheckboxFeatures = set.features;
      const g = gaps(extractCheckboxActivations(session).filter((a) => a.completed).map((a) => a.endT));
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          activationTime: f.timeToFirstActivation,
          pressDuration: f.pressDuration,
          completionTime: f.completionTime,
          interClickMean: f.interActivationTime,
          interClickCv: cv(g, 2),
          attemptCount: f.activationCount,
          activationCount: f.activationCount,
        },
      };
    }
    case "image-grid": {
      const ch = challenge as ImageGridChallenge;
      const set = registry.get("image-grid").extractFeatures(ch, session);
      const f: ImageGridFeatures = set.features;
      const known = new Set(ch.cells.map((c) => c.id));
      const toggles = extractToggles(session).filter((t) => known.has(t.cellId));
      const g = gaps(toggles.map((t) => t.t));
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          completionTime: f.completionTime,
          interClickMean: f.interClickTimeMean,
          corrections: f.correctionCount,
          interClickCv: cv(g, 2),
          pauseCount: g.filter((x) => x > PAUSE_MS).length,
          attemptCount: f.attemptCount,
          activationCount: toggles.length,
        },
      };
    }
    case "text": {
      const set = registry.get("text").extractFeatures(challenge as TextChallenge, session);
      const f: TextFeatures = set.features;
      const keyTimes = session.events.filter((e) => isKeyEvent(e) && e.type === "keydown" && e.target === TEXT_TARGET && isCharacterKey(e.code)).map((e) => e.t);
      const g = gaps(keyTimes);
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          completionTime: f.completionTime,
          interKeyMean: f.interKeyTimeMean,
          corrections: f.correctionCount,
          interKeyCv: cv(g, 3),
          pauseCount: g.filter((x) => x > PAUSE_MS).length,
          attemptCount: f.attemptCount,
          activationCount: f.keyCount,
        },
      };
    }
    case "rotation": {
      const center = (context as { center: Point } | undefined)?.center ?? DEFAULT_ROTATION_CENTER;
      const ch = challenge as RotationChallenge;
      const set = registry.get("rotation").extractFeatures(ch, session, { center });
      const f: RotationFeatures = set.features;
      const released = deriveRotation(ch, { center }, session).drags.filter((d) => d.released);
      // The first step (press to first move) and the last (last move to release) are left out, as for the pointer.
      const steps = released.flatMap((d) => d.steps.slice(1, -1));
      const speeds = steps.filter((s) => s.dt > 0).map((s) => (Math.abs(s.delta) / s.dt) * 1000);
      return {
        sourceSchema: set.schemaVersion,
        values: {
          reactionTime: f.reactionTime,
          completionTime: f.completionTime,
          angularMeanVelocity: f.meanAngularVelocity,
          angularMaxVelocity: f.maxAngularVelocity,
          angularSpeedCv: cv(speeds, 5),
          corrections: f.angularCorrections,
          finalAngularError: f.finalAngularError,
          sampleIntervalCv: cv(steps.filter((s) => s.dt > 0).map((s) => s.dt), 5),
          attemptCount: f.attemptCount,
        },
      };
    }
  }
}

/** The vector used by Compare and the classifier: derived numbers only, plus the version of their definitions. */
export function toBehavioralVector(captchaId: LabTaskId, session: InteractionSession, extraction: BehaviorExtraction): BehavioralVector {
  return {
    captchaId,
    featureSetVersion: BEHAVIOR_FEATURE_SET,
    sourceSchema: extraction.sourceSchema,
    inputModality: session.inputModality,
    values: extraction.values,
  };
}

export function analyzeSession(captchaId: BehaviorCaptchaId, challenge: unknown, session: InteractionSession, context: BehaviorContext): BehavioralVector {
  return toBehavioralVector(captchaId, session, extractSignals(captchaId, challenge, session, context));
}
