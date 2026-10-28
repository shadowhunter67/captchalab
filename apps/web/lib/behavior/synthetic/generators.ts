import { SCHEMA_VERSION, createRng, inferModality, type InteractionEvent, type InteractionSession, type Point } from "@captchalab/captcha-core";
import {
  CHECKBOX_TARGETS,
  ROTATION_TARGET,
  TEXT_CHAR_CODES,
  TEXT_TARGET,
  makeCellTarget,
  makeDragItemTarget,
  makeDropTarget,
  normalizedToPx,
  hitRadiusPx,
  normalize360,
  wrap180,
  type CheckboxChallenge,
  type DragDropChallenge,
  type DragDropLayout,
  type ImageGridChallenge,
  type RotationChallenge,
  type TextChallenge,
} from "@captchalab/captcha-plugins";

/**
 * Generators for synthetic InteractionSessions. They write the normalized event records directly: no DOM
 * event is created or dispatched, nothing is sent anywhere, and they only draw to the target of a CaptchaLab
 * challenge, which the generator already knows because the lab made it. Same inputs, same session.
 */

export const SAMPLE_MS = 16;

const easeInOutCubic = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const r1 = (n: number): number => Math.round(n * 10) / 10;
export const between = (rng: () => number, lo: number, hi: number): number => lo + rng() * (hi - lo);

/** Append-only, time-ordered event list. Enforces non-decreasing times (the recorder guarantees it for real data). */
export class Events {
  readonly list: InteractionEvent[] = [];
  private last = 0;

  private at(t: number): number {
    const v = Math.max(this.last, r1(t));
    this.last = v;
    return v;
  }

  pointer(type: "pointerdown" | "pointermove" | "pointerup", t: number, p: Point, target?: string): void {
    this.list.push({ t: this.at(t), type, x: r1(p.x), y: r1(p.y), pointerId: 1, pointerType: "mouse", ...(target === undefined ? {} : { target }) });
  }

  key(type: "keydown" | "keyup", t: number, code: string, target: string): void {
    this.list.push({ t: this.at(t), type, code, target });
  }

  get end(): number {
    return this.last;
  }
}

export interface SyntheticOutput {
  session: InteractionSession;
}

export function toSession(captchaId: string, profile: string, ev: Events, tailMs = 100): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `synthetic-${captchaId}-${profile}`,
    captchaId,
    startedAt: 0,
    durationMs: r1(ev.end + tailMs),
    events: ev.list,
    inputModality: inferModality(ev.list),
  };
}

// ---------------------------------------------------------------------------------------------- Drag & Drop

export const DRAG_PROFILES = ["direct", "eased", "noisy"] as const;
export type DragProfile = (typeof DRAG_PROFILES)[number];

export interface SyntheticDragOptions {
  profile: DragProfile;
  challenge: DragDropChallenge;
  layout: DragDropLayout;
  seed?: number;
}

/** Picks every item up at its centre and drops it on the centre of its own target, one after the other. */
export function generateSyntheticDragDropSession(opts: SyntheticDragOptions): InteractionSession {
  const { profile, challenge, layout } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const noisy = profile === "noisy";
  const radius = hitRadiusPx(challenge, layout);
  let t = noisy ? between(rng, 500, 900) : 300;

  for (const item of challenge.items) {
    const target = challenge.targets.find((x) => x.acceptsItemId === item.id);
    if (!target) continue;
    const from = normalizedToPx(item.start, layout);
    const to = normalizedToPx(target.position, layout);
    // The noisy profile lands off-centre but always inside the drop area.
    const land: Point = noisy ? { x: to.x + between(rng, -0.4, 0.4) * radius, y: to.y + between(rng, -0.4, 0.4) * radius } : to;
    const duration = noisy ? between(rng, 650, 1100) : profile === "eased" ? 700 : 600;
    const steps = Math.max(2, Math.round(duration / SAMPLE_MS));
    // A perpendicular bow makes the noisy path curved instead of a straight line.
    const dx = land.x - from.x;
    const dy = land.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = noisy ? between(rng, -0.12, 0.12) * len : 0;

    ev.pointer("pointerdown", t, from, makeDragItemTarget(item.id));
    let tt = t;
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const k = profile === "direct" ? p : easeInOutCubic(p);
      tt = noisy ? Math.max(tt + 1, t + p * duration + (rng() - 0.5) * 8) : t + p * duration;
      const wobble = noisy ? Math.sin(p * Math.PI) * bow : 0;
      ev.pointer(
        "pointermove",
        tt,
        {
          x: from.x + dx * k + (-dy / len) * wobble + (noisy ? (rng() - 0.5) * 3 : 0),
          y: from.y + dy * k + (dx / len) * wobble + (noisy ? (rng() - 0.5) * 3 : 0),
        },
        undefined,
      );
    }
    const upT = Math.max(tt + 1, t + duration);
    ev.pointer("pointerup", upT, land, makeDropTarget(target.id));
    t = upT + (noisy ? between(rng, 250, 900) : 250);
  }
  return toSession("drag-drop", profile, ev);
}

// -------------------------------------------------------------------------------------------------- Checkbox

export const CHECKBOX_PROFILES = ["immediate", "delayed", "regular-timing"] as const;
export type CheckboxProfile = (typeof CHECKBOX_PROFILES)[number];

export interface SyntheticCheckboxOptions {
  profile: CheckboxProfile;
  challenge?: CheckboxChallenge;
  seed?: number;
}

const CHECKBOX_POINT: Point = { x: 20, y: 24 };

/** Press-and-release gestures on the control, as the checkbox controller records them. */
export function generateSyntheticCheckboxSession(opts: SyntheticCheckboxOptions): InteractionSession {
  const { profile } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const press = (t: number, hold: number): void => {
    ev.pointer("pointerdown", t, CHECKBOX_POINT, CHECKBOX_TARGETS.control);
    ev.pointer("pointerup", t + hold, CHECKBOX_POINT, CHECKBOX_TARGETS.control);
  };
  if (profile === "immediate") press(120, 10);
  else if (profile === "delayed") press(between(rng, 1400, 2400), between(rng, 70, 160));
  else for (let i = 0; i < 3; i++) press(1000 + i * 600, 100);
  return toSession("checkbox", profile, ev);
}

// ------------------------------------------------------------------------------------------------ Image Grid

export const GRID_PROFILES = ["immediate", "uniform-interval", "variable-interval"] as const;
export type GridProfile = (typeof GRID_PROFILES)[number];

export interface SyntheticGridOptions {
  profile: GridProfile;
  challenge: ImageGridChallenge;
  seed?: number;
}

const CELL_PITCH = 100;
const cellPoint = (index: number): Point => ({ x: (index % 3) * CELL_PITCH + CELL_PITCH / 2, y: Math.floor(index / 3) * CELL_PITCH + CELL_PITCH / 2 });

/** Clicks the tiles that show the target shape (the lab knows them; no vision involved). */
export function generateSyntheticImageGridSession(opts: SyntheticGridOptions): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const wanted = challenge.cells.map((c, i) => ({ c, i })).filter(({ c }) => c.shape === challenge.target);
  const click = (t: number, index: number, hold: number): void => {
    const cell = challenge.cells[index];
    if (!cell) return;
    const target = makeCellTarget(cell.id);
    ev.pointer("pointerdown", t, cellPoint(index), target);
    ev.pointer("pointerup", t + hold, cellPoint(index), target);
  };

  if (profile === "immediate") {
    wanted.forEach(({ i }, n) => click(100 + n * 60, i, 12));
  } else if (profile === "uniform-interval") {
    wanted.forEach(({ i }, n) => click(800 + n * 700, i, 90));
  } else {
    let t = between(rng, 900, 1800);
    const wrong = challenge.cells.findIndex((c) => c.shape !== challenge.target);
    const wrongAt = wrong >= 0 ? Math.floor(rng() * (wanted.length + 1)) : -1;
    const order = wanted.map((w) => w.i);
    if (wrongAt >= 0) order.splice(wrongAt, 0, wrong);
    for (const i of order) {
      click(t, i, between(rng, 60, 140));
      t += between(rng, 400, 1600);
      // Notices the wrong tile and takes it back.
      if (i === wrong) {
        click(t, i, between(rng, 60, 140));
        t += between(rng, 400, 1200);
      }
    }
  }
  return toSession("image-grid", profile, ev);
}

// ------------------------------------------------------------------------------------------------------ Text

export const TEXT_PROFILES = ["uniform-typing", "variable-typing", "correction-typing"] as const;
export type TextProfile = (typeof TEXT_PROFILES)[number];

export interface SyntheticTextOptions {
  profile: TextProfile;
  challenge: TextChallenge;
  seed?: number;
}

/** The coarse class the Text recorder stores for a character (never the character itself). */
const charClass = (ch: string): string => (/[0-9]/.test(ch) ? TEXT_CHAR_CODES.digit : TEXT_CHAR_CODES.letter);

export function generateSyntheticTextSession(opts: SyntheticTextOptions): InteractionSession {
  const { profile, challenge } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  const uniform = profile === "uniform-typing";
  const typeKey = (t: number, code: string, dwell: number): void => {
    ev.key("keydown", t, code, TEXT_TARGET);
    ev.key("keyup", t + dwell, code, TEXT_TARGET);
  };
  const chars = [...challenge.text];
  const mistakeAt = profile === "correction-typing" ? Math.min(chars.length - 1, 1 + Math.floor(rng() * Math.max(1, chars.length - 1))) : -1;
  let t = uniform ? 600 : between(rng, 700, 1500);
  const gap = (): number => (uniform ? 180 : between(rng, 120, 420));
  const dwell = (): number => (uniform ? 70 : between(rng, 50, 120));

  chars.forEach((ch, i) => {
    if (i === mistakeAt) {
      typeKey(t, TEXT_CHAR_CODES.letter, dwell());
      t += between(rng, 500, 900); // notices the mistake
      typeKey(t, "Backspace", dwell());
      t += gap();
    }
    typeKey(t, charClass(ch), dwell());
    t += gap();
  });
  typeKey(t + (uniform ? 300 : between(rng, 300, 700)), "Enter", 60);
  return toSession("text", profile, ev);
}

// --------------------------------------------------------------------------------------------------- Rotation

export const ROTATION_PROFILES = ["direct", "eased", "overshoot-correct"] as const;
export type RotationProfile = (typeof ROTATION_PROFILES)[number];

export interface SyntheticRotationOptions {
  profile: RotationProfile;
  challenge: RotationChallenge;
  /** Centre of the object in the same space as the pointer coordinates. */
  center: Point;
  seed?: number;
}

const POINTER_RADIUS = 80;

/** Moves the pointer round the object's centre; the object turns by the pointer's angle (shortest way). */
export function generateSyntheticRotationSession(opts: SyntheticRotationOptions): InteractionSession {
  const { profile, challenge, center } = opts;
  const rng = createRng(opts.seed ?? 1);
  const ev = new Events();
  // The turn needed to reach upright, the short way round.
  const need = wrap180(challenge.targetAngle - normalize360(challenge.initialAngle));
  const dir = need < 0 ? -1 : 1;
  const tolerance = Math.max(1, challenge.tolerance);
  const over = Math.min(25, Math.max(8, Math.abs(need) * 0.15)) * dir;
  // The overshoot profile ends a little off centre but always inside the tolerance.
  const finalTurn = profile === "overshoot-correct" ? need + (rng() - 0.5) * tolerance * 0.6 : need;
  const duration = profile === "direct" ? 900 : profile === "eased" ? 1100 : 1400;
  const startT = profile === "overshoot-correct" ? between(rng, 400, 800) : 400;
  const steps = Math.max(2, Math.round(duration / SAMPLE_MS));
  const a0 = -90;

  const at = (turn: number): Point => ({
    x: center.x + POINTER_RADIUS * Math.cos(((a0 + turn) * Math.PI) / 180),
    y: center.y + POINTER_RADIUS * Math.sin(((a0 + turn) * Math.PI) / 180),
  });
  const turnAt = (p: number): number => {
    if (profile === "direct") return need * p;
    if (profile === "eased") return need * easeInOutCubic(p);
    const peak = need + over;
    return p < 0.7 ? peak * easeInOutCubic(p / 0.7) : peak + (finalTurn - peak) * easeInOutCubic((p - 0.7) / 0.3);
  };

  ev.pointer("pointerdown", startT, at(0), ROTATION_TARGET);
  for (let i = 1; i < steps; i++) ev.pointer("pointermove", startT + (i / steps) * duration, at(turnAt(i / steps)));
  ev.pointer("pointerup", startT + duration, at(profile === "overshoot-correct" ? finalTurn : need), ROTATION_TARGET);
  return toSession("rotation", profile, ev);
}
