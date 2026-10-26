import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import type { AudioChallenge } from "./types";
import { AUDIO_VARIANTS } from "./variants";

/** Same seed + variant + difficulty, same digits, same gaps and the same noise. */
export function generateAudioChallenge({ rng, variantId, difficulty }: GenerateContext): AudioChallenge {
  const { config, challengeConfig } = resolveVariant(AUDIO_VARIANTS, { variantId, difficulty });
  assertRange("audio digits", config.digits, 3, 8);
  assertRange("audio gap", config.gapMs, 240, 1500);
  assertRange("audio noise level", config.noiseLevel, 0, 0.12);
  let digits = "";
  for (let i = 0; i < config.digits; i++) digits += String(Math.floor(rng() * 10));
  const noiseSeed = Math.floor(rng() * 0x100000000);
  const id = `audio-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, digits, gapMs: config.gapMs, noiseLevel: config.noiseLevel, noiseSeed, config: challengeConfig };
}
