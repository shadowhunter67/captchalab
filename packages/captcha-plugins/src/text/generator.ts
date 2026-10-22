import type { GenerateContext } from "@captchalab/captcha-core";
import { TEXT_ALPHABET, TEXT_LENGTH, type TextChallenge, type TextGlyph, type TextNoiseLine } from "./types";

const round3 = (n: number): number => Math.round(n * 1e3) / 1e3;

/** Same seed, same text and same distortion. No clock, no Math.random. */
export function generateTextChallenge({ rng }: GenerateContext): TextChallenge {
  let text = "";
  for (let i = 0; i < TEXT_LENGTH; i++) text += TEXT_ALPHABET[Math.floor(rng() * TEXT_ALPHABET.length)] ?? "A";
  const glyphs: TextGlyph[] = [...text].map((char) => ({
    char,
    rotate: Math.round((rng() - 0.5) * 36),
    dy: round3((rng() - 0.5) * 0.24),
  }));
  const noise: TextNoiseLine[] = Array.from({ length: 4 }, () => ({
    x1: round3(rng()), y1: round3(rng()), x2: round3(rng()), y2: round3(rng()),
  }));
  const id = `text-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, text, glyphs, noise };
}
