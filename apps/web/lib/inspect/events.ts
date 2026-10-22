import { isKeyEvent, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";

/** One displayed field of the selected event. Only fields that exist on the event are produced. */
export interface EventField {
  label: string;
  value: string;
}

/**
 * Projects a normalized event onto displayable fields. Reads only the CaptchaLab event schema
 * (never a DOM object) and never logs anything.
 */
export function projectEventFields(e: InteractionEvent): EventField[] {
  const fields: EventField[] = [
    { label: "type", value: e.type },
    { label: "t", value: `${e.t.toFixed(1)} ms` },
  ];
  if (isKeyEvent(e)) {
    fields.push({ label: "code", value: e.code });
  } else {
    fields.push({ label: "x", value: `${e.x.toFixed(1)} px` });
    fields.push({ label: "y", value: `${e.y.toFixed(1)} px` });
    fields.push({ label: "pointerId", value: String(e.pointerId) });
    fields.push({ label: "pointerType", value: e.pointerType });
    if (e.pressure !== undefined) fields.push({ label: "pressure", value: e.pressure.toFixed(2) });
  }
  if (e.target !== undefined) fields.push({ label: "target", value: e.target });
  return fields;
}

export type TimelineKind = "down" | "up" | "cancel" | "keydown" | "keyup" | "click" | "move";

export function timelineKind(e: InteractionEvent): TimelineKind {
  switch (e.type) {
    case "pointerdown":
    case "touchstart":
      return "down";
    case "pointerup":
    case "touchend":
      return "up";
    case "pointercancel":
      return "cancel";
    case "keydown":
      return "keydown";
    case "keyup":
      return "keyup";
    case "click":
      return "click";
    case "pointermove":
    case "touchmove":
      return "move";
  }
}

export interface TimelineMarker {
  /** Index into session.events: the stable identity used for selection. */
  index: number;
  t: number;
  kind: Exclude<TimelineKind, "move">;
}

export interface MoveBin {
  /** Fractional position along the axis, [0, 1]. */
  from: number;
  to: number;
  count: number;
  /** Index of the first move event in the bin (selected when the bin is clicked). */
  firstIndex: number;
}

/** A UI annotation on the time axis; the caller owns the wording. */
export interface TimelineAnnotation {
  t: number;
  label: string;
}

export interface TimelineModel {
  startT: number;
  endT: number;
  markers: TimelineMarker[];
  bins: MoveBin[];
  maxBinCount: number;
  eventCount: number;
}

/**
 * Visual summary of a session for the timeline: discrete events become markers, pointermove
 * events are grouped into density bins (the full event list is untouched and stays inspectable
 * through selection). A degenerate time range is widened so the axis never divides by zero.
 */
export function buildTimelineModel(
  session: InteractionSession,
  binCount = 48,
  /** Times of annotations drawn on the axis; they widen the domain so none falls outside it. */
  extraTimes: readonly number[] = [],
): TimelineModel {
  const events = session.events;
  if (events.length === 0) {
    return { startT: 0, endT: 1, markers: [], bins: [], maxBinCount: 0, eventCount: 0 };
  }
  let startT = Number.POSITIVE_INFINITY;
  let endT = Number.NEGATIVE_INFINITY;
  for (const e of events) {
    startT = Math.min(startT, e.t);
    endT = Math.max(endT, e.t);
  }
  for (const t of extraTimes) {
    if (!Number.isFinite(t)) continue;
    startT = Math.min(startT, t);
    endT = Math.max(endT, t);
  }
  if (endT <= startT) endT = startT + 1;
  const span = endT - startT;

  const markers: TimelineMarker[] = [];
  const counts = new Array<number>(binCount).fill(0);
  const firstIndex = new Array<number>(binCount).fill(-1);
  events.forEach((e, index) => {
    const kind = timelineKind(e);
    if (kind === "move") {
      const bin = Math.min(binCount - 1, Math.floor(((e.t - startT) / span) * binCount));
      counts[bin] = (counts[bin] ?? 0) + 1;
      if (firstIndex[bin] === -1) firstIndex[bin] = index;
    } else {
      markers.push({ index, t: e.t, kind });
    }
  });

  const bins: MoveBin[] = [];
  counts.forEach((count, i) => {
    if (count > 0) {
      bins.push({ from: i / binCount, to: (i + 1) / binCount, count, firstIndex: firstIndex[i] as number });
    }
  });
  return { startT, endT, markers, bins, maxBinCount: Math.max(0, ...counts), eventCount: events.length };
}

/** Whether time t falls in the bin [from, to) of the model; the last bin also includes the end. */
export function binContainsTime(model: TimelineModel, bin: MoveBin, t: number): boolean {
  const span = model.endT - model.startT;
  const lo = model.startT + bin.from * span;
  const hi = model.startT + bin.to * span;
  return t >= lo && (t < hi || (bin.to >= 1 && t <= hi));
}

/** Selection helper: next/previous event index, clamped; null selection starts from the edges. */
export function stepSelection(current: number | null, delta: 1 | -1, eventCount: number): number | null {
  if (eventCount <= 0) return null;
  if (current === null) return delta === 1 ? 0 : eventCount - 1;
  return Math.min(eventCount - 1, Math.max(0, current + delta));
}
