import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { TEXT_ALPHABET, type TextChallenge, type TextGlyph, type TextNoiseLine } from "./types";
import { TEXT_VARIANTS } from "./variants";

const round3 = (n: number): number => Math.round(n * 1e3) / 1e3;

/** Same seed + variant + difficulty, same text and same distortion. No clock, no Math.random. */
export function generateTextChallenge({ rng, variantId, difficulty }: GenerateContext): TextChallenge {
  const { config, challengeConfig } = resolveVariant(TEXT_VARIANTS, { variantId, difficulty });
  assertRange("text length", config.length, 3, 8);
  assertRange("text rotation", config.rotationDeg, 0, 35);
  assertRange("text shift", config.shift, 0, 0.15);
  assertRange("text noise lines", config.noiseLines, 0, 30);
  let text = "";
  for (let i = 0; i < config.length; i++) text += TEXT_ALPHABET[Math.floor(rng() * TEXT_ALPHABET.length)] ?? "A";
  const glyphs: TextGlyph[] = [...text].map((char) => ({
    char,
    rotate: Math.round((rng() - 0.5) * 2 * config.rotationDeg),
    dy: round3((rng() - 0.5) * 2 * config.shift),
  }));
  const noise: TextNoiseLine[] = Array.from({ length: config.noiseLines }, () => ({
    x1: round3(rng()), y1: round3(rng()), x2: round3(rng()), y2: round3(rng()),
  }));
  const id = `text-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, text, glyphs, noise, config: challengeConfig };
}
