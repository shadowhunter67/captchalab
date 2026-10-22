"use client";

import { useMemo, useRef } from "react";
import type { InteractionSession, Point } from "@captchalab/captcha-core";
import type { RotationChallenge } from "@captchalab/captcha-plugins";
import { ReplayControls } from "@/components/inspect/ReplayControls";
import { useReplayPanel } from "@/lib/replay/useReplayPanel";
import { RotationGlyph } from "./RotationGlyph";
import { createRotationReplay } from "./rotation-view-data";

interface Props {
  challenge: RotationChallenge;
  center: Point;
  session: InteractionSession;
}

/** Replay: the object turns as recorded, driven by the generic replay clock. Draws data; controls nothing. */
export function RotationReplay({ challenge, center, session }: Props) {
  const model = useMemo(() => createRotationReplay(challenge, center, session), [challenge, center, session]);
  const glyphRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);

  const { hostRef, controlsProps } = useReplayPanel(model.range, session, (s, host) => {
    const angle = model.at(s.currentTime);
    if (glyphRef.current) glyphRef.current.style.transform = `rotate(${angle}deg)`;
    if (labelRef.current) labelRef.current.textContent = `${Math.round(angle)}° clockwise from upright`;
    if (host) host.dataset.replayAngle = angle.toFixed(1);
  });

  if (!model.range) {
    return <p className="text-sm text-muted" data-testid="replay-empty">No rotation input was recorded, so there is nothing to replay.</p>;
  }
  return (
    <div ref={hostRef} data-testid="replay">
      <div className="flex justify-center rounded-lg bg-bg p-3 ring-1 ring-line">
        <div ref={glyphRef} style={{ width: 140, height: 140 }} data-testid="replay-object">
          <RotationGlyph size={140} />
        </div>
      </div>
      <p ref={labelRef} className="mt-2 text-center text-sm" data-testid="replay-angle" />
      <ReplayControls {...controlsProps} />
      <p className="mt-2 text-xs text-muted">
        The replay draws your recorded turns; it does not control the object. With reduced motion enabled, Play jumps
        to the end; use the position control to step through.
      </p>
    </div>
  );
}
