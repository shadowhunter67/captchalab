import { SCHEMA_VERSION, createRng, inferModality, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import { SLIDER_TARGETS, positionToTravelPx, sliderTravel, type SliderChallenge, type SliderLayout } from "@captchalab/captcha-plugins";

/**
 * Synthetic Slider sessions for the Compare page. They are generated DATA: a valid InteractionSession
 * handed to the same feature extractors as a real one. No DOM event is created or dispatched, and nothing
 * here is an attack on any CAPTCHA: it only draws a path to the CaptchaLab demo's own target.
 *
 *   linear  constant speed in a straight line
 *   eased   speed follows an ease-in-out curve (slow, fast, slow)
 *   noisy   eased, with a small overshoot that is corrected, jittered x/y and uneven sample times
 */
export const SYNTHETIC_PROFILES = ["linear", "eased", "noisy"] as const;
export type SyntheticProfile = (typeof SYNTHETIC_PROFILES)[number];

export const PROFILE_LABELS: Record<SyntheticProfile, string> = {
  linear: "Linear",
  eased: "Eased",
  noisy: "Noisy",
};

export const PROFILE_DESCRIPTIONS: Record<SyntheticProfile, string> = {
  linear: "Constant speed in a straight line, regular sample times.",
  eased: "Speed follows an ease-in-out curve, regular sample times, straight line.",
  noisy: "Eased, then a small overshoot is corrected; position jitter and uneven sample times.",
};

export const DEFAULT_SYNTHETIC_LAYOUT: SliderLayout = { trackLeft: 0, trackWidth: 320, handleWidth: 44 };
/** y of the pointer while dragging a centred handle; only its variation matters. */
const TRACK_Y = 22;
const SAMPLE_MS = 16;
const START_T = 400;

const easeInOutCubic = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export interface SyntheticSliderOptions {
  profile: SyntheticProfile;
  challenge: SliderChallenge;
  layout?: SliderLayout;
  /** Same seed, same session. Only the noisy profile uses randomness. */
  seed?: number;
}

export function generateSyntheticSliderSession(opts: SyntheticSliderOptions): InteractionSession {
  const { profile, challenge } = opts;
  const layout = opts.layout ?? DEFAULT_SYNTHETIC_LAYOUT;
  const rng = createRng(opts.seed ?? 1);
  const travel = sliderTravel(layout);
  const x0 = layout.trackLeft + layout.handleWidth / 2;
  const xEnd = x0 + positionToTravelPx(challenge.target, layout);
  const duration = profile === "noisy" ? 1000 + Math.round(rng() * 400) : 900;
  const overshoot = Math.min(10, travel * 0.03);
  const steps = Math.max(2, Math.round(duration / SAMPLE_MS));

  const xAt = (p: number): number => {
    if (profile === "linear") return x0 + (xEnd - x0) * p;
    if (profile === "eased") return x0 + (xEnd - x0) * easeInOutCubic(p);
    const peak = xEnd + overshoot;
    return p < 0.8
      ? x0 + (peak - x0) * easeInOutCubic(p / 0.8)
      : peak + (xEnd - peak) * easeInOutCubic((p - 0.8) / 0.2);
  };

  const events: InteractionEvent[] = [];
  const base = { pointerId: 1, pointerType: "mouse" as const };
  const at = (t: number, type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number): void => {
    events.push({ ...base, t, type, x, y, ...(type === "pointermove" ? {} : { target: SLIDER_TARGETS.handle }) });
  };

  at(START_T, "pointerdown", x0, TRACK_Y);
  let t = START_T;
  let y = TRACK_Y;
  for (let i = 1; i < steps; i++) {
    const p = i / steps;
    t = profile === "noisy" ? Math.max(t + 1, START_T + p * duration + (rng() - 0.5) * 8) : START_T + p * duration;
    let x = xAt(p);
    if (profile === "noisy") {
      x += (rng() - 0.5) * 3;
      y = TRACK_Y + clamp01(0.5 + (y - TRACK_Y) / 12 + (rng() - 0.5) * 0.4) * 12 - 6;
    }
    at(Math.round(t * 10) / 10, "pointermove", Math.min(layout.trackLeft + layout.trackWidth, Math.max(layout.trackLeft, x)), y);
  }
  const endT = Math.max(t + 1, START_T + duration);
  at(Math.round(endT * 10) / 10, "pointerup", xEnd, profile === "noisy" ? y : TRACK_Y);

  return {
    schemaVersion: SCHEMA_VERSION,
    id: `synthetic-${profile}`,
    captchaId: "slider",
    startedAt: 0,
    durationMs: endT + 100,
    events,
    inputModality: inferModality(events),
  };
}
