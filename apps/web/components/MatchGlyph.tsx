import { useId } from "react";
import type { GlyphLook } from "@captchalab/captcha-plugins";

interface Props {
  look: GlyphLook;
  /** Relative size around the centre; 1 = normal. */
  scale?: number;
}

/**
 * The generic MatchKey / Tile Game picture, from SVG primitives only (no bitmap, no outside asset). The small mark on
 * top turns with the orientation, so every orientation looks different. Decorative: the button carries the label.
 */
export function MatchGlyph({ look, scale = 1 }: Props) {
  const uid = useId().replace(/:/g, "");
  const fill = look.pattern === "solid" ? "var(--fg)" : look.pattern === "striped" ? `url(#s${uid})` : `url(#d${uid})`;
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`s${uid}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="3" height="6" fill="var(--fg)" />
        </pattern>
        <pattern id={`d${uid}`} patternUnits="userSpaceOnUse" width="7" height="7">
          <circle cx="3.5" cy="3.5" r="1.8" fill="var(--fg)" />
        </pattern>
      </defs>
      <g transform={`translate(24 24) rotate(${look.orientation}) scale(${scale}) translate(-24 -24)`}>
        <g fill={fill} stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round">
          {look.shape === "circle" && <circle cx="24" cy="25" r="13" />}
          {look.shape === "square" && <rect x="11" y="12" width="26" height="26" />}
          {look.shape === "triangle" && <polygon points="24,11 38,38 10,38" />}
          {look.shape === "hexagon" && <polygon points="24,11 36,18 36,32 24,39 12,32 12,18" />}
        </g>
        <polygon points="24,2 28.5,8.5 19.5,8.5" fill="var(--fg)" />
      </g>
    </svg>
  );
}
