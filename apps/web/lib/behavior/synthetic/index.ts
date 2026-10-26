import type { InteractionSession, Point } from "@captchalab/captcha-core";
import type {
  CheckboxChallenge,
  DragDropChallenge,
  DragDropLayout,
  ImageGridChallenge,
  RotationChallenge,
  SliderChallenge,
  SliderLayout,
  TextChallenge,
} from "@captchalab/captcha-plugins";
import { generateSyntheticSliderSession, SYNTHETIC_PROFILES as SLIDER_PROFILES, type SyntheticProfile as SliderProfile } from "@/lib/synthetic/slider-synthetic";
import { DEFAULT_DRAG_LAYOUT, DEFAULT_ROTATION_CENTER, DEFAULT_SLIDER_LAYOUT, analyzeSession } from "../analysis";
import { SYNTHETIC_GENERATOR_VERSION, type BehaviorCaptchaId, type BehaviorContext, type BehaviorSample } from "../types";
import {
  CHECKBOX_PROFILES,
  DRAG_PROFILES,
  GRID_PROFILES,
  ROTATION_PROFILES,
  TEXT_PROFILES,
  generateSyntheticCheckboxSession,
  generateSyntheticDragDropSession,
  generateSyntheticImageGridSession,
  generateSyntheticRotationSession,
  generateSyntheticTextSession,
  type CheckboxProfile,
  type DragProfile,
  type GridProfile,
  type RotationProfile,
  type TextProfile,
} from "./generators";

export * from "./profiles";

export interface SyntheticRequest {
  captchaId: BehaviorCaptchaId;
  profile: string;
  /** The SAME challenge object the human attempted. */
  challenge: unknown;
  /** Layout/centre of the human attempt when there is one, so both are measured in the same space. */
  context?: BehaviorContext;
  seed: number;
}

const has = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

export function defaultContext(captchaId: BehaviorCaptchaId): BehaviorContext {
  switch (captchaId) {
    case "slider":
      return DEFAULT_SLIDER_LAYOUT;
    case "drag-drop":
      return DEFAULT_DRAG_LAYOUT;
    case "rotation":
      return { center: DEFAULT_ROTATION_CENTER };
    default:
      return undefined;
  }
}

/** Throws RangeError for a profile the CAPTCHA does not have: a mismatched request is a bug, not a fallback. */
export function generateSyntheticSession(req: SyntheticRequest): InteractionSession {
  const { captchaId, profile, seed } = req;
  const context = req.context ?? defaultContext(captchaId);
  const bad = (): never => {
    throw new RangeError(`Unknown synthetic profile "${profile}" for ${captchaId}`);
  };
  switch (captchaId) {
    case "slider":
      return has<SliderProfile>(SLIDER_PROFILES, profile)
        ? generateSyntheticSliderSession({ profile, challenge: req.challenge as SliderChallenge, layout: context as SliderLayout, seed })
        : bad();
    case "drag-drop":
      return has<DragProfile>(DRAG_PROFILES, profile)
        ? generateSyntheticDragDropSession({ profile, challenge: req.challenge as DragDropChallenge, layout: context as DragDropLayout, seed })
        : bad();
    case "checkbox":
      return has<CheckboxProfile>(CHECKBOX_PROFILES, profile)
        ? generateSyntheticCheckboxSession({ profile, challenge: req.challenge as CheckboxChallenge, seed })
        : bad();
    case "image-grid":
      return has<GridProfile>(GRID_PROFILES, profile)
        ? generateSyntheticImageGridSession({ profile, challenge: req.challenge as ImageGridChallenge, seed })
        : bad();
    case "text":
      return has<TextProfile>(TEXT_PROFILES, profile)
        ? generateSyntheticTextSession({ profile, challenge: req.challenge as TextChallenge, seed })
        : bad();
    case "rotation":
      return has<RotationProfile>(ROTATION_PROFILES, profile)
        ? generateSyntheticRotationSession({ profile, challenge: req.challenge as RotationChallenge, center: (context as { center: Point }).center, seed })
        : bad();
  }
}

/** A synthetic sample: the generated session, analysed by the same extractors as a human one. */
export function generateSyntheticSample(req: SyntheticRequest): BehaviorSample {
  const context = req.context ?? defaultContext(req.captchaId);
  const session = generateSyntheticSession({ ...req, context });
  return {
    origin: "synthetic",
    captchaId: req.captchaId,
    session,
    context,
    vector: analyzeSession(req.captchaId, req.challenge, session, context),
    synthetic: { profile: req.profile, generator: SYNTHETIC_GENERATOR_VERSION, seed: req.seed },
  };
}
