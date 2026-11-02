import { useId } from "react";
import { GLYPH_ORIENTATIONS, GLYPH_PATTERNS, GLYPH_SHAPES, type GlyphLook, type GlyphSkin } from "@captchalab/captcha-plugins";
import { drawObject, inkWith } from "@/lib/art/draw";

interface Props {
  look: GlyphLook;
  /** Relative size around the centre; 1 = normal. */
  scale?: number;
  /** The object variants: the same look drawn as a pictured object, colourway and quarter turn. */
  skin?: GlyphSkin | undefined;
}

/** Pattern -> colourway of a skinned glyph. */
const COLOURWAY: Record<(typeof GLYPH_PATTERNS)[number], string> = { solid: "#d94f4f", striped: "#2f7fd1", dotted: "#3a9a5b" };

/**
 * The generic MatchKey / Tile Game picture, from SVG primitives only (no bitmap, no outside asset). The small mark on
 * top turns with the orientation, so every orientation looks different. Decorative: the button carries the label.
 */
export function MatchGlyph({ look, scale = 1, skin }: Props) {
  const uid = useId().replace(/:/g, "");
  if (skin) {
    const object = skin.objects[GLYPH_SHAPES.indexOf(look.shape)] ?? skin.objects[0];
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
        <g transform={`translate(50 50) scale(${scale}) translate(-50 -50)`}>
          {/* The card stays upright; only the object on it turns, so a turned object is still a recognisable object. */}
          <rect x={4} y={4} width={92} height={92} rx={14} fill="#ffffff" stroke="var(--line)" strokeWidth={2.5} />
          <g transform={`translate(50 50) rotate(${GLYPH_ORIENTATIONS.includes(look.orientation) ? look.orientation : 0}) scale(0.7) translate(-50 -50)`}>
            {object ? drawObject(object, inkWith(COLOURWAY[look.pattern])) : null}
          </g>
        </g>
      </svg>
    );
  }
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
