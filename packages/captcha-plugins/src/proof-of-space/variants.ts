import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface PosVariantConfig {
  [key: string]: number | string;
  /** Buffer size in bytes. */
  bytes: number;
  /** Positions a sample proof reports (0 for the checksum variant). */
  sampleCount: number;
}

/**
 * Sizes stay small on purpose: 256 KB, 1 MB and 4 MB fill in well under a second on a normal device and never come
 * near a memory problem. The page also fills in small chunks and can be cancelled.
 */
export const POS_VARIANTS: CaptchaVariantSet<PosVariantConfig> = {
  variants: [
    {
      id: "sampled",
      name: "Sampled proof",
      description: "Fill the buffer, then report the bytes at positions the challenge picks.",
      difficulties: {
        easy: { bytes: 256 * 1024, sampleCount: 16 },
        medium: { bytes: 1024 * 1024, sampleCount: 24 },
        hard: { bytes: 4 * 1024 * 1024, sampleCount: 32 },
      },
    },
    {
      id: "checksum",
      name: "Full checksum",
      description: "Fill the buffer, then report a checksum of all of it.",
      difficulties: {
        easy: { bytes: 256 * 1024, sampleCount: 0 },
        medium: { bytes: 1024 * 1024, sampleCount: 0 },
        hard: { bytes: 4 * 1024 * 1024, sampleCount: 0 },
      },
    },
  ],
  defaultSelection: { variantId: "sampled", difficulty: "easy" },
};
