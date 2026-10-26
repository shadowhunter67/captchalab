import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface PowVariantConfig {
  [key: string]: number | string;
  algorithm: string;
  /** Required hex prefix ("" for the bits variant). */
  prefix: string;
  /** Required leading zero bits (0 for the prefix variant). */
  bits: number;
  /** Rough number of hashes needed on average (16^zeros, or 2^bits). Display only. */
  expectedHashes: number;
}

/**
 * Difficulty stays low on purpose: a level should finish in well under a second on a normal device and never freeze
 * the page (the page also computes in small chunks and can be cancelled).
 */
export const POW_VARIANTS: CaptchaVariantSet<PowVariantConfig> = {
  variants: [
    {
      id: "hash-prefix",
      name: "Hash prefix",
      description: "Find a nonce whose SHA-256 hex digest starts with zeros: two, three or four.",
      difficulties: {
        easy: { algorithm: "SHA-256", prefix: "00", bits: 0, expectedHashes: 256 },
        medium: { algorithm: "SHA-256", prefix: "000", bits: 0, expectedHashes: 4096 },
        hard: { algorithm: "SHA-256", prefix: "0000", bits: 0, expectedHashes: 65536 },
      },
    },
    {
      id: "leading-zero-bits",
      name: "Leading zero bits",
      description: "The same idea counted in bits, so each level doubles the work in finer steps.",
      difficulties: {
        easy: { algorithm: "SHA-256", prefix: "", bits: 9, expectedHashes: 512 },
        medium: { algorithm: "SHA-256", prefix: "", bits: 13, expectedHashes: 8192 },
        hard: { algorithm: "SHA-256", prefix: "", bits: 15, expectedHashes: 32768 },
      },
    },
  ],
  defaultSelection: { variantId: "hash-prefix", difficulty: "medium" },
};
