"use client";

import type { KeyboardEvent } from "react";
import { TIMELINE_LEGEND, binContainsTime, type TimelineAnnotation, type TimelineKind, type TimelineModel } from "@/lib/inspect/events";

interface Props {
  model: TimelineModel;
  /** UI annotations with caller-provided wording; drawn as dashed lines, not selectable. */
  annotations?: readonly TimelineAnnotation[];
  /** True when the selected event is a pointer move (only then is a density bin highlighted). */
  selectedIsMove: boolean;
  /** Time of the selected event; the single source of truth is the selected event index. */
  selectedT: number | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const W = 480;
const H = 84;
const PAD_X = 14;
const AXIS_Y = 58;
const MAX_BAR = 34;

const LABEL: Record<Exclude<TimelineKind, "move">, string> = {
  down: "press",
  up: "release",
  cancel: "cancel",
  keydown: "key down",
  keyup: "key up",
  click: "click",
};

function Glyph({ kind, x, y }: { kind: Exclude<TimelineKind, "move">; x: number; y: number }) {
  const common = { stroke: "var(--fg)", strokeWidth: 2 };
  switch (kind) {
    case "down":
      return <circle cx={x} cy={y} r={5} fill="var(--fg)" {...common} />;
    case "up":
      return <circle cx={x} cy={y} r={5} fill="var(--bg)" {...common} />;
    case "cancel":
      return <path d={`M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x - 5} ${y + 5}`} fill="none" {...common} />;
    case "keydown":
      return <rect x={x - 5} y={y - 5} width={10} height={10} fill="var(--fg)" {...common} />;
    case "keyup":
      return <rect x={x - 5} y={y - 5} width={10} height={10} fill="var(--bg)" {...common} />;
    case "click":
      return <path d={`M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`} fill="var(--bg)" {...common} />;
  }
}

/**
 * Visual event timeline: discrete events (press / release / cancel / key) are focusable markers on
 * a time axis; pointermove events are summarized as a density histogram (clicking a bar selects its
 * first move). The full event list is never altered; selection is by event index.
 */
export function EventTimeline({ model, annotations = [], selectedIsMove, selectedT, selectedIndex, onSelect }: Props) {
  const span = model.endT - model.startT;
  const xAt = (t: number): number => PAD_X + ((t - model.startT) / span) * (W - 2 * PAD_X);
  const xFrac = (f: number): number => PAD_X + f * (W - 2 * PAD_X);

  const activate = (index: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(index);
    }
  };

  return (
    <div className="min-w-0">
      <svg
        role="group"
        aria-label={`Event timeline with ${model.eventCount} events. Markers are press, release, cancel, key and click events; bars summarize pointer movement.`}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-md bg-bg ring-1 ring-line"
        data-testid="event-timeline"
      >
        <line x1={PAD_X} x2={W - PAD_X} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--line)" strokeWidth={2} />
        {model.bins.map((b) => {
          const h = Math.max(3, (b.count / model.maxBinCount) * MAX_BAR);
          const selected = selectedIsMove && selectedT !== null && binContainsTime(model, b, selectedT);
          return (
            <rect
              key={b.firstIndex}
              x={xFrac(b.from) + 0.5}
              y={AXIS_Y - h}
              width={Math.max(1, xFrac(b.to) - xFrac(b.from) - 1)}
              height={h}
              fill={selected ? "var(--accent)" : "var(--track)"}
              stroke="var(--muted)"
              strokeWidth={0.5}
              className="cursor-pointer"
              aria-hidden="true" // pointer-only shortcut; every event is reachable with Previous/Next
              data-testid="timeline-bin"
              onClick={() => onSelect(b.firstIndex)}
            >
              <title>{`${b.count} pointer move${b.count === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
        {annotations.map((m, i) => (
          <g key={`annotation${i}`} aria-hidden="true" data-testid="timeline-reset" data-t={m.t}>
            <line x1={xAt(m.t)} x2={xAt(m.t)} y1={8} y2={AXIS_Y + 12} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={xAt(m.t) + 3} y={14} fontSize={10} fill="var(--muted)">
              {m.label}
            </text>
          </g>
        ))}
        {model.markers.map((m) => (
          <g
            key={m.index}
            role="button"
            tabIndex={0}
            aria-label={`Select event ${m.index + 1}: ${LABEL[m.kind]} at ${m.t.toFixed(0)} ms`}
            aria-pressed={selectedIndex === m.index}
            className="cursor-pointer"
            data-testid="timeline-marker"
            data-kind={m.kind}
            onClick={() => onSelect(m.index)}
            onKeyDown={activate(m.index)}
          >
            <rect x={xAt(m.t) - 9} y={AXIS_Y - 9} width={18} height={18} fill="transparent" />
            <Glyph kind={m.kind} x={xAt(m.t)} y={AXIS_Y} />
          </g>
        ))}
        {selectedT !== null && (
          <line
            x1={xAt(selectedT)}
            x2={xAt(selectedT)}
            y1={4}
            y2={AXIS_Y + 14}
            stroke="var(--accent)"
            strokeWidth={2.5}
            data-testid="timeline-selected"
          />
        )}
        <text x={PAD_X} y={H - 4} fontSize={11} fill="var(--muted)">
          {(model.startT / 1000).toFixed(2)} s
        </text>
        <text x={W - PAD_X} y={H - 4} fontSize={11} textAnchor="end" fill="var(--muted)">
          {(model.endT / 1000).toFixed(2)} s
        </text>
      </svg>
      <p className="mt-1 text-xs text-muted">
        {TIMELINE_LEGEND.map((l) => `${l.glyph} ${l.label}`).join(" · ")} · bars: pointer-move density. Focus a marker and press
        Enter, or use the buttons below.
      </p>
    </div>
  );
}
