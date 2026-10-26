"use client";

import { useMemo } from "react";
import { extractGestures, gestureTrack, type InteractionSession, type Point, type TimedPoint } from "@captchalab/captcha-core";
import {
  deriveDragAttempts,
  hitRadiusPx,
  normalizedToPx,
  type DragDropChallenge,
  type DragDropLayout,
  type SliderChallenge,
  type SliderLayout,
} from "@captchalab/captcha-plugins";
import { TrajectoryView } from "@/components/inspect/TrajectoryView";
import { buildDragDropTrajectory } from "@/features/drag-drop/drag-drop-view-data";
import { buildSliderTrajectory } from "@/features/slider/slider-view-data";
import { buildTrajectoryGeometry } from "@/lib/inspect/trajectory";
import type { BehaviorCaptchaId, BehaviorContext } from "@/lib/behavior/types";

const TRACK_HEIGHT = 44;
const ROTATION_RING = 80;

interface Props {
  captchaId: "slider" | "drag-drop" | "rotation";
  challenge: unknown;
  session: InteractionSession;
  context: BehaviorContext;
  label: string;
  testId: string;
}

/** The CAPTCHAs whose interaction is a path. The others compare timing instead. */
export const MOTION_CAPTCHAS: readonly BehaviorCaptchaId[] = ["slider", "drag-drop", "rotation"];

/** Pointer path of one sample over the challenge's own geometry (reuses the Inspect trajectory renderer). */
export function TrajectoryPanel({ captchaId, challenge, session, context, label, testId }: Props) {
  const view = useMemo(() => {
    switch (captchaId) {
      case "slider": {
        const v = buildSliderTrajectory(session, context as SliderLayout, challenge as SliderChallenge, TRACK_HEIGHT);
        return {
          geometry: v.geometry,
          underlay: (
            <>
              <rect x={v.track.x} y={v.track.y} width={v.track.width} height={v.track.height} fill="var(--track)" />
              <rect x={v.targetRegion.x} y={v.targetRegion.y} width={v.targetRegion.width} height={v.targetRegion.height} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
            </>
          ),
          maxHeight: 160,
        };
      }
      case "drag-drop": {
        const layout = context as DragDropLayout;
        const ch = challenge as DragDropChallenge;
        const g = buildDragDropTrajectory(deriveDragAttempts(ch, layout, session), layout);
        return {
          geometry: g,
          underlay: (
            <>
              <rect x={g.surface.x} y={g.surface.y} width={g.surface.width} height={g.surface.height} fill="none" stroke="var(--line)" />
              {ch.targets.map((tg) => {
                const c = normalizedToPx(tg.position, layout);
                return <circle key={tg.id} cx={c.x} cy={c.y} r={hitRadiusPx(ch, layout)} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />;
              })}
            </>
          ),
          maxHeight: 220,
        };
      }
      case "rotation": {
        const center = (context as { center: Point }).center;
        const tracks: TimedPoint[][] = extractGestures(session).map((g) => gestureTrack(g.events)).filter((tr) => tr.length >= 2);
        const box = { x: center.x - ROTATION_RING - 12, y: center.y - ROTATION_RING - 12, width: (ROTATION_RING + 12) * 2, height: (ROTATION_RING + 12) * 2 };
        return {
          geometry: buildTrajectoryGeometry(tracks, [box]),
          underlay: (
            <>
              <circle cx={center.x} cy={center.y} r={ROTATION_RING} fill="none" stroke="var(--line)" strokeDasharray="4 3" />
              <path d={`M${center.x - 6} ${center.y}H${center.x + 6}M${center.x} ${center.y - 6}V${center.y + 6}`} stroke="var(--muted)" />
            </>
          ),
          maxHeight: 220,
        };
      }
    }
  }, [captchaId, challenge, session, context]);

  return <TrajectoryView geometry={view.geometry} label={label} testId={testId} maxHeight={view.maxHeight} underlay={view.underlay} />;
}
