"use client";

import { useId } from "react";
import { createRng } from "@captchalab/captcha-core";
import type { TextChallenge } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";

const W = 320;
const H = 104;

const FONTS = ["Georgia, 'Times New Roman', serif", "ui-sans-serif, system-ui, 'Segoe UI', Arial, sans-serif", "ui-monospace, Menlo, Consolas, monospace"];
/** Dark inks only: every character keeps strong contrast against the pale backgrounds. */
const INK = ["#1f2a44", "#7a1f2b", "#1d5c3a", "#4a2a7a", "#7a4a12", "#14506b"];
const PAPER = ["#f1f5fb", "#fbf4ec", "#f0f7f1", "#f6f1fa"];
const NOISE = ["#8d97ab", "#b08a8a", "#7fa08c", "#9a8fb5"];

/** A small stable number from the challenge id: the decoration is seeded, so the same challenge always looks the same. */
function hashOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

/**
 * The distorted text as an SVG drawn from the challenge's own deterministic glyph/noise data, dressed like a real text
 * CAPTCHA: tinted speckled paper, a different font, ink, size and slant for each character, uneven spacing, curves and
 * lines across, and a mild wave over everything. Strength follows the challenge's own parameters and always stays
 * readable for a person (dark ink on pale paper, no overlap that hides a character). The wrapper is labelled for assistive
 * technology WITHOUT the characters (a demo limitation, stated on the page): the image itself is hidden from the
 * accessibility tree.
 */
export function TextImage({ challenge }: { challenge: TextChallenge }) {
  const t = useT();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rng = createRng(hashOf(challenge.id));
  const params = (challenge.config?.parameters ?? {}) as Record<string, number | string>;
  const rotation = typeof params.rotationDeg === "number" ? params.rotationDeg : 12;
  const wave = Math.min(4.5, 1.5 + rotation / 9); // displacement of the mild wave, picture units
  const paper = PAPER[Math.floor(rng() * PAPER.length)] as string;
  const step = (W - 40) / challenge.glyphs.length;
  const specks = Array.from({ length: 70 }, () => [rng() * W, rng() * H, 0.5 + rng() * 1.3, rng() < 0.5 ? "#9aa5ba" : "#c3b3b3"] as const);
  const curves = Array.from({ length: 2 }, (_, i) => {
    const y = H * (0.3 + 0.4 * rng());
    const a = 10 + rng() * 14;
    return `M0 ${y + (i ? 8 : -8)} C ${W * 0.25} ${y - a}, ${W * 0.6} ${y + a}, ${W} ${y + (rng() - 0.5) * 24}`;
  });
  return (
    <div
      role="img"
      aria-label={t(
        "Ảnh các ký tự bị méo. Hãy gõ các ký tự bạn thấy. Bản demo này không có văn bản thay thế.",
        "Image of distorted characters. Type the characters you see. There is no text alternative in this demo.",
      )}
      data-testid="text-image"
      className="inline-block max-w-full overflow-hidden rounded-md ring-1 ring-line"
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" style={{ height: "auto" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id={`wave${uid}`} x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.018 0.045" numOctaves="2" seed={(hashOf(challenge.id) % 90) + 1} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={wave} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={paper} />
        {specks.map(([x, y, r, c], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={c} opacity="0.5" />
        ))}
        <g filter={`url(#wave${uid})`}>
          {curves.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={NOISE[i % NOISE.length]} strokeWidth="1.6" opacity="0.7" />
          ))}
          {challenge.noise.map((n, i) => (
            <line key={i} x1={n.x1 * W} y1={n.y1 * H} x2={n.x2 * W} y2={n.y2 * H} stroke={NOISE[i % NOISE.length]} strokeWidth={1.2 + (i % 3) * 0.5} opacity="0.65" />
          ))}
          {challenge.glyphs.map((g, i) => {
            const cx = 20 + step * (i + 0.5) + (rng() - 0.5) * 8;
            const cy = H / 2 + 13 + g.dy * H;
            const size = 40 + Math.floor(rng() * 9) - 3;
            const skew = (rng() - 0.5) * 18;
            return (
              <text
                key={i}
                x={cx}
                y={cy}
                fontSize={size}
                fontWeight={600 + Math.floor(rng() * 3) * 100}
                fontFamily={FONTS[Math.floor(rng() * FONTS.length)]}
                textAnchor="middle"
                fill={INK[Math.floor(rng() * INK.length)]}
                stroke="#ffffff"
                strokeWidth="1.1"
                paintOrder="stroke"
                transform={`translate(${cx} ${cy}) rotate(${g.rotate}) skewX(${skew.toFixed(1)}) translate(${-cx} ${-cy})`}
              >
                {g.char}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
