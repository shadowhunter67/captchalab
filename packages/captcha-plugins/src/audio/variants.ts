import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface AudioVariantConfig {
  [key: string]: number | string;
  /** Digits spoken. */
  digits: number;
  /** Silence between clips, ms. */
  gapMs: number;
  /** "none", "low", "moderate" or "high" (display name of the noise level). */
  noise: string;
  /** Noise amplitude relative to full scale. Speech clips peak around 0.5, so even "high" stays well under it. */
  noiseLevel: number;
}

/**
 * Hearing stays possible at every level: the noise is quiet next to the speech, the gaps never drop below 240 ms
 * and nothing gets louder. There is no volume control in the page; the device volume applies.
 */
export const AUDIO_VARIANTS: CaptchaVariantSet<AudioVariantConfig> = {
  variants: [
    {
      id: "spoken-digits",
      name: "Spoken digits",
      description: "Digits read out one by one; difficulty adds digits, shortens the gaps and adds quiet noise.",
      difficulties: {
        easy: { digits: 4, gapMs: 600, noise: "none", noiseLevel: 0 },
        medium: { digits: 5, gapMs: 400, noise: "low", noiseLevel: 0.03 },
        hard: { digits: 6, gapMs: 240, noise: "moderate", noiseLevel: 0.06 },
      },
    },
    {
      id: "noisy-digits",
      name: "Digits with noise",
      description: "The same digits over background noise at every level.",
      difficulties: {
        easy: { digits: 4, gapMs: 500, noise: "low", noiseLevel: 0.03 },
        medium: { digits: 5, gapMs: 400, noise: "moderate", noiseLevel: 0.06 },
        hard: { digits: 6, gapMs: 300, noise: "high", noiseLevel: 0.1 },
      },
    },
  ],
  defaultSelection: { variantId: "spoken-digits", difficulty: "medium" },
};
