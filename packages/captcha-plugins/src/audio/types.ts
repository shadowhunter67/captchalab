import type { BaseCaptchaFeatures, ChallengeConfig, InputModality } from "@captchalab/captcha-core";

export const AUDIO_ID = "audio" as const;
/** Semantic target of key events from the answer field. */
export const AUDIO_TARGET = "audio-input" as const;
/** Semantic target of the Play / Replay button. */
export const AUDIO_PLAY_TARGET = "audio-play" as const;

/**
 * A spoken sequence of digits. `digits` is both the clip order and the expected answer. Playback uses locally
 * stored clips (one per digit); the noise is generated in the page from `noiseSeed`, so the same challenge always
 * sounds the same.
 */
export interface AudioChallenge {
  id: string;
  digits: string;
  /** Silence between clips, ms. */
  gapMs: number;
  /** Background noise amplitude relative to full scale (0 = none). Kept low on purpose. */
  noiseLevel: number;
  noiseSeed: number;
  config?: ChallengeConfig;
}

/** What was typed, as text. Compared strictly: exactly the digits, nothing else. */
export interface AudioAnswer {
  value: string;
}

/** Local clip file for a digit, relative to the site's audio folder. */
export const clipPath = (digit: string): string => `audio/digits/${digit}.wav`;

/**
 * AUDIO FEATURE DEFINITIONS (schema audio@1). Times ms on the session clock.
 *
 * Play press: a completed press on the Play/Replay button or a Space/Enter keydown on it. Typing: key events on
 * AUDIO_TARGET, same rules as the Text CAPTCHA; PRIVACY: character keys are stored by class only ("Digit"...),
 * never which digit. The microphone is never used and nothing is recorded from the user.
 *
 * reactionTime            First press on Play or first key in the field. null if none.
 * timeToFirstPlay         First Play press. null if none.
 * playCount               Play and Replay presses.
 * timeToFirstKey          First character key. null if none.
 * completionTime          (base) the whole session.
 * keyCount, backspaceCount, correctionCount, attemptCount   As in the Text CAPTCHA.
 * timeFromLastPlayToEnd   From the last Play press to the end of the session. null if never played.
 * inputModality           Session modality.
 */
export interface AudioFeatures extends BaseCaptchaFeatures {
  reactionTime: number | null;
  timeToFirstPlay: number | null;
  playCount: number;
  timeToFirstKey: number | null;
  keyCount: number;
  backspaceCount: number;
  correctionCount: number;
  attemptCount: number;
  timeFromLastPlayToEnd: number | null;
  inputModality: InputModality;
}

export const AUDIO_FEATURES_SCHEMA = "audio@1";
export const AUDIO_EXTRACTOR = "audio@1";
