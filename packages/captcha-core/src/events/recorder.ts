import {
  SCHEMA_VERSION,
  isPointerEvent,
  type InputModality,
  type InteractionEvent,
  type InteractionSession,
  type ViewportInfo,
} from "../types/events";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface RecorderOptions {
  captchaId: string;
  /** Monotonic clock in ms. Defaults to performance.now. Injectable for tests. */
  now?: () => number;
  /** Drop pointermove/touchmove closer than this to the previous kept move. Default 0 (keep all). */
  minMoveIntervalMs?: number;
  /** Hard cap protecting memory; further events are dropped and counted. Default 20_000. */
  maxEvents?: number;
  viewport?: ViewportInfo;
  idFactory?: () => string;
}

export interface EventRecorder {
  /** Record an event; `t` is stamped by the recorder. Plain array push, no React, no copying of DOM events. */
  record(event: DistributiveOmit<InteractionEvent, "t">): void;
  /** Monotonic ms since the recorder started (same clock as event `t`, never decreasing). */
  elapsedMs(): number;
  readonly size: number;
  readonly dropped: number;
  /** Copy of the session so far; recording continues. For mid-session verify/inspect. */
  snapshot(): InteractionSession;
  /** Final session; later record() calls are ignored. */
  finish(): InteractionSession;
}

function isFiniteEvent(e: DistributiveOmit<InteractionEvent, "t">): boolean {
  if ("x" in e && !(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.pointerId))) return false;
  if ("pressure" in e && e.pressure !== undefined && !Number.isFinite(e.pressure)) return false;
  return true;
}

export function inferModality(events: readonly InteractionEvent[]): InputModality {
  if (events.length === 0) return "none";
  const seen = new Set<InputModality>();
  for (const e of events) seen.add(isPointerEvent(e) ? e.pointerType : "keyboard");
  if (seen.size === 1) return [...seen][0] as InputModality;
  return "mixed";
}

export function createEventRecorder(options: RecorderOptions): EventRecorder {
  const now = options.now ?? (() => performance.now());
  const minMove = options.minMoveIntervalMs ?? 0;
  const cap = options.maxEvents ?? 20_000;
  const startedAt = Date.now();
  const t0 = now();
  let lastT = 0;
  let clock = 0;
  /** Monotonic elapsed time shared by events and elapsedMs(), so markers and events never reorder. */
  const mono = (elapsed: number): number => (clock = Math.max(clock, elapsed));
  const buffer: InteractionEvent[] = [];
  let lastMoveT = Number.NEGATIVE_INFINITY;
  let dropped = 0;
  let finished = false;

  const id = options.idFactory?.() ?? crypto.randomUUID();
  const build = (events: InteractionEvent[]): InteractionSession => {
    const last = events[events.length - 1];
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      captchaId: options.captchaId,
      startedAt,
      durationMs: Math.max(last?.t ?? 0, lastT, clock, now() - t0),
      events,
      inputModality: inferModality(events),
      ...(options.viewport ? { viewport: options.viewport } : {}),
    };
  };

  return {
    record(event) {
      if (finished) return;
      const elapsed = now() - t0;
      if (!Number.isFinite(elapsed) || !isFiniteEvent(event)) {
        dropped++;
        return;
      }
      const t = mono(elapsed); // monotonic even if the clock misbehaves
      const isMove = event.type === "pointermove" || event.type === "touchmove";
      if ((isMove && t - lastMoveT < minMove) || buffer.length >= cap) {
        dropped++;
        return;
      }
      lastT = t;
      if (isMove) lastMoveT = t;
      buffer.push({ ...event, t } as InteractionEvent);
    },
    get size() {
      return buffer.length;
    },
    get dropped() {
      return dropped;
    },
    elapsedMs() {
      const e = now() - t0;
      return Number.isFinite(e) ? mono(e) : clock;
    },
    snapshot: () => build(buffer.slice()),
    finish() {
      finished = true;
      return build(buffer);
    },
  };
}
