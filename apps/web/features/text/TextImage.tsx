import type { TextChallenge } from "@captchalab/captcha-plugins";

const W = 260;
const H = 80;

/**
 * The distorted text as an SVG drawn from the challenge's own deterministic glyph/noise data. The wrapper is
 * labelled for assistive technology WITHOUT the characters (a demo limitation, stated on the page): the image
 * itself is hidden from the accessibility tree.
 */
export function TextImage({ challenge }: { challenge: TextChallenge }) {
  const step = W / (challenge.glyphs.length + 1);
  return (
    <div
      role="img"
      aria-label="Image of distorted characters. Type the characters you see. There is no text alternative in this demo."
      data-testid="text-image"
      className="inline-block rounded-md bg-bg ring-1 ring-line"
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        {challenge.noise.map((n, i) => (
          <line key={i} x1={n.x1 * W} y1={n.y1 * H} x2={n.x2 * W} y2={n.y2 * H} stroke="var(--muted)" strokeWidth={1.5} opacity={0.6} />
        ))}
        {challenge.glyphs.map((g, i) => (
          <text
            key={i}
            x={step * (i + 1)}
            y={H / 2 + 12 + g.dy * H}
            fontSize={36}
            fontWeight={700}
            fontFamily="ui-monospace, Menlo, Consolas, monospace"
            textAnchor="middle"
            fill="var(--fg)"
            transform={`rotate(${g.rotate} ${step * (i + 1)} ${H / 2 + g.dy * H})`}
          >
            {g.char}
          </text>
        ))}
      </svg>
    </div>
  );
}
