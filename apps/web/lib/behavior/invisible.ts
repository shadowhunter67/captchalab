import {
  SCHEMA_VERSION,
  createRng,
  extractGestures,
  extractMotionFeatures,
  inferModality,
  isKeyEvent,
  pathLength,
  pointerTracks,
  type InteractionEvent,
  type InteractionSession,
  type Point,
} from "@captchalab/captcha-core";
import { BEHAVIOR_FEATURE_SET, SYNTHETIC_GENERATOR_VERSION, type BehavioralVector, type SyntheticMeta } from "./types";
import { moveSegments } from "./analysis";
import { cv, gaps } from "./stats";
import type { ClassificationLabel } from "./classifier";

/**
 * The neutral task of the Invisible / Behavioral demo: click a target that moves to a new place after every
 * click. It is not a puzzle; its only purpose is to give the lab some pointer interaction to measure, on the
 * dedicated lab page and only after an explicit Start.
 */
export const INVISIBLE_PAD = { width: 480, height: 240 } as const;
export const INVISIBLE_TARGET_RADIUS = 22;
export const INVISIBLE_TARGETS: readonly Point[] = [
  { x: 70, y: 60 },
  { x: 410, y: 90 },
  { x: 240, y: 190 },
  { x: 90, y: 180 },
];
export const INVISIBLE_TARGET_ID = "inv-target" as const;
export const INVISIBLE_PAD_ID = "inv-pad" as const;
export const INVISIBLE_SOURCE_SCHEMA = "invisible@1";

/** Derived signals of an Invisible-task session. Numbers only; coordinates stay in the session. */
export function analyzeInvisibleSession(session: InteractionSession): BehavioralVector {
  const clicks: number[] = [];
  let missed = 0;
  for (const g of extractGestures(session)) {
    if (g.target === INVISIBLE_TARGET_ID && g.endedBy === "up") clicks.push(g.endT);
    else if (g.target === INVISIBLE_PAD_ID) missed++;
  }
  for (const e of session.events) {
    if (isKeyEvent(e) && e.type === "keydown" && e.target === INVISIBLE_TARGET_ID && (e.code === "Space" || e.code === "Enter")) clicks.push(e.t);
  }
  clicks.sort((a, b) => a - b);
  const g = gaps(clicks);

  // One track per movement between two clicks (hover included: the approach is the signal).
  const tracks = pointerTracks(session).filter((t) => t.length >= 2);
  const { speeds, intervals } = moveSegments(session);
  let chord = 0;
  let path = 0;
  for (const t of tracks) {
    const a = t[0] as Point;
    const b = t[t.length - 1] as Point;
    chord += Math.hypot(b.x - a.x, b.y - a.y);
    path += pathLength(t);
  }
  const motion = extractMotionFeatures(session);
  const hasPointer = tracks.length > 0;

  return {
    captchaId: "invisible",
    featureSetVersion: BEHAVIOR_FEATURE_SET,
    sourceSchema: INVISIBLE_SOURCE_SCHEMA,
    inputModality: session.inputModality,
    values: {
      reactionTime: motion.reactionTime,
      completionTime: session.durationMs,
      pointerDistance: hasPointer ? motion.pointerDistance : null,
      meanVelocity: hasPointer ? motion.meanVelocity : null,
      speedCv: cv(speeds, 5),
      straightness: path > 0 ? Math.min(1, chord / path) : null,
      directionChanges: hasPointer ? motion.directionChanges : null,
      corrections: missed,
      sampleIntervalCv: cv(intervals, 5),
      interClickMean: g.length > 0 ? g.reduce((a, b) => a + b, 0) / g.length : null,
      interClickCv: cv(g, 2),
      attemptCount: clicks.length,
    },
  };
}

// ------------------------------------------------------------------------------------------ synthetic example

export const INVISIBLE_PROFILES = ["regular", "eased", "mixed", "variable"] as const;
export type InvisibleProfile = (typeof INVISIBLE_PROFILES)[number];

export const INVISIBLE_PROFILE_TEXT: Readonly<Record<InvisibleProfile, { en: string; vi: string; descEn: string; descVi: string }>> = {
  regular: { en: "Regular", vi: "Đều", descEn: "Constant speed in straight lines, equal pauses.", descVi: "Tốc độ không đổi theo đường thẳng, các lần dừng bằng nhau." },
  eased: { en: "Eased", vi: "Mượt dần", descEn: "Slow-fast-slow straight moves, equal pauses.", descVi: "Di chuyển thẳng chậm - nhanh - chậm, các lần dừng bằng nhau." },
  mixed: { en: "Mixed", vi: "Hỗn hợp", descEn: "Slow-fast-slow straight moves with regular samples, but uneven pauses between clicks.", descVi: "Di chuyển thẳng chậm - nhanh - chậm với mẫu đều, nhưng thời gian dừng giữa các lần bấm không đều." },
  variable: { en: "Variable", vi: "Thay đổi", descEn: "Curved, jittery moves with uneven pauses.", descVi: "Di chuyển cong, rung nhẹ, các lần dừng không đều." },
};

const easeInOutCubic = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** A generated session for the same task, so the demo can show a result without any human input. */
export function generateSyntheticInvisibleSession(profile: InvisibleProfile, seed = 1): { session: InteractionSession; meta: SyntheticMeta } {
  const rng = createRng(seed);
  const events: InteractionEvent[] = [];
  let last = 0;
  const add = (type: "pointermove" | "pointerdown" | "pointerup", t: number, p: Point, target?: string): void => {
    last = Math.max(last, r1(t));
    events.push({ t: last, type, x: r1(p.x), y: r1(p.y), pointerId: 1, pointerType: "mouse", ...(target === undefined ? {} : { target }) });
  };
  const noisy = profile === "variable";
  const unevenPauses = noisy || profile === "mixed";
  let pos: Point = { x: 20, y: 20 };
  let t = noisy ? 500 + rng() * 600 : 400;
  add("pointermove", t, pos);
  for (const target of INVISIBLE_TARGETS) {
    const duration = noisy ? 450 + rng() * 650 : 600;
    const steps = Math.round(duration / 16);
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = noisy ? (rng() - 0.5) * 0.3 * len : 0;
    let tt = t;
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const k = profile === "regular" ? p : easeInOutCubic(p);
      tt = noisy ? Math.max(tt + 1, t + p * duration + (rng() - 0.5) * 8) : t + p * duration;
      const wobble = Math.sin(p * Math.PI) * bow;
      add("pointermove", tt, {
        x: pos.x + dx * k + (-dy / len) * wobble + (noisy ? (rng() - 0.5) * 3 : 0),
        y: pos.y + dy * k + (dx / len) * wobble + (noisy ? (rng() - 0.5) * 3 : 0),
      });
    }
    const down = Math.max(tt + 1, t + duration);
    add("pointerdown", down, target, INVISIBLE_TARGET_ID);
    add("pointerup", down + (unevenPauses ? 60 + rng() * 80 : 90), target, INVISIBLE_TARGET_ID);
    pos = target;
    t = last + (unevenPauses ? 150 + rng() * 700 : 300);
  }
  return {
    session: { schemaVersion: SCHEMA_VERSION, id: `synthetic-invisible-${profile}`, captchaId: "invisible", startedAt: 0, durationMs: r1(last + 100), events, inputModality: inferModality(events) },
    meta: { profile, generator: SYNTHETIC_GENERATOR_VERSION, seed },
  };
}

// ---------------------------------------------------------------------------------------------- escalation

export type EscalationKey = "none" | "checkbox" | "slider";

export interface Escalation {
  key: EscalationKey;
  /** Where the corresponding demo lives; offered as a link, never followed automatically. */
  href: string | null;
  en: string;
  vi: string;
}

/**
 * A SIMULATED suggestion for which lab demo a risk-based system might show next. It does not redirect,
 * block, or enforce anything, and it is not a risk engine.
 */
export function escalationFor(label: ClassificationLabel): Escalation {
  switch (label) {
    case "human-like":
      return { key: "none", href: null, en: "No extra challenge selected.", vi: "Không chọn thêm thử thách nào." };
    case "uncertain":
      return { key: "checkbox", href: "/playground/checkbox", en: "A Checkbox demo is suggested.", vi: "Gợi ý dùng bản demo Ô đánh dấu." };
    case "synthetic-like":
      return { key: "slider", href: "/playground/slider", en: "A Slider demo is suggested.", vi: "Gợi ý dùng bản demo Thanh trượt." };
  }
}
