"use client";

import { isKeyEvent, isPointerEvent, type InteractionSession } from "@captchalab/captcha-core";
import { useT } from "@/lib/i18n";

const W = 480;
const H = 64;
const PAD = 12;

interface Props {
  session: InteractionSession;
  label: string;
  /** Shared across the samples being compared so equal times line up. */
  maxT: number;
  testId?: string;
}

/**
 * One row of an event comparison: when presses, releases and keys happened on a time axis, with pointer moves as
 * faint ticks. Shows timing only (no coordinates, no characters), for CAPTCHAs without a meaningful path.
 */
export function EventStrip({ session, label, maxT, testId }: Props) {
  const t = useT();
  const span = Math.max(1, maxT);
  const x = (ms: number): number => PAD + (Math.min(ms, span) / span) * (W - 2 * PAD);
  const counts = { press: 0, release: 0, keys: 0 };
  const marks: { key: string; t: number; kind: "down" | "up" | "cancel" | "keydown" | "keyup" | "move" }[] = [];
  session.events.forEach((e, i) => {
    if (isPointerEvent(e)) {
      if (e.type === "pointermove" || e.type === "touchmove") marks.push({ key: `m${i}`, t: e.t, kind: "move" });
      else if (e.type === "pointerdown" || e.type === "touchstart") {
        counts.press++;
        marks.push({ key: `d${i}`, t: e.t, kind: "down" });
      } else if (e.type === "pointerup" || e.type === "touchend") {
        counts.release++;
        marks.push({ key: `u${i}`, t: e.t, kind: "up" });
      } else if (e.type === "pointercancel") marks.push({ key: `c${i}`, t: e.t, kind: "cancel" });
    } else if (isKeyEvent(e)) {
      if (e.type === "keydown") counts.keys++;
      marks.push({ key: `k${i}`, t: e.t, kind: e.type });
    }
  });
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg
      role="img"
      aria-label={t(
        `${label}: ${counts.press} lần nhấn, ${counts.release} lần thả, ${counts.keys} lần nhấn phím trong ${(session.durationMs / 1000).toFixed(2)} giây`,
        `${label}: ${counts.press} presses, ${counts.release} releases, ${counts.keys} key presses in ${(session.durationMs / 1000).toFixed(2)} s`,
      )}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-md bg-bg ring-1 ring-line"
      style={{ aspectRatio: `${W} / ${H}`, maxHeight: 96 }}
      data-testid={testId}
    >
      <line x1={PAD} x2={W - PAD} y1={46} y2={46} stroke="var(--line)" strokeWidth={1} />
      {ticks.map((p) => (
        <g key={p} aria-hidden="true">
          <line x1={x(p * span)} x2={x(p * span)} y1={46} y2={50} stroke="var(--muted)" />
          <text x={x(p * span)} y={61} fontSize={9} textAnchor="middle" fill="var(--muted)">{(p * span / 1000).toFixed(1)}s</text>
        </g>
      ))}
      {marks.map((m) => {
        const cx = x(m.t);
        switch (m.kind) {
          case "move":
            return <line key={m.key} x1={cx} x2={cx} y1={14} y2={24} stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1} aria-hidden="true" />;
          case "down":
            return <circle key={m.key} cx={cx} cy={34} r={4.5} fill="var(--fg)" stroke="var(--fg)" strokeWidth={1.5} aria-hidden="true" />;
          case "up":
            return <circle key={m.key} cx={cx} cy={34} r={4.5} fill="var(--bg)" stroke="var(--fg)" strokeWidth={1.5} aria-hidden="true" />;
          case "cancel":
            return <path key={m.key} d={`M${cx - 4} 30L${cx + 4} 38M${cx + 4} 30L${cx - 4} 38`} stroke="var(--fg)" strokeWidth={1.5} fill="none" aria-hidden="true" />;
          case "keydown":
            return <rect key={m.key} x={cx - 4} y={30} width={8} height={8} fill="var(--fg)" aria-hidden="true" />;
          case "keyup":
            return <rect key={m.key} x={cx - 4} y={30} width={8} height={8} fill="var(--bg)" stroke="var(--fg)" strokeWidth={1.5} aria-hidden="true" />;
        }
      })}
    </svg>
  );
}
