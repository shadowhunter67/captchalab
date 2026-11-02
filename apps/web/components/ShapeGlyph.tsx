import { isArtCategory, type GridShape, type GridSubject } from "@captchalab/captcha-plugins";
import { drawObject, inkFor } from "@/lib/art/draw";
import { artLabel } from "@/lib/art/names";
import type { Translate } from "@/lib/i18n";

interface Props {
  shape: GridSubject;
  /** Degrees, clockwise. */
  rotation?: number;
  /** false draws only the outline. */
  filled?: boolean;
  /** Relative size around the centre; 1 = normal. */
  scale?: number;
}

/** One shape drawn from SVG primitives (no bitmap, no dataset). Decorative: the button around it carries the label. */
export function ShapeGlyph({ shape, rotation = 0, filled = true, scale = 1 }: Props) {
  if (isArtCategory(shape)) {
    // A pictured object, or (filled = false) its silhouette: one flat colour, the shape of the same drawing.
    const seed = [...shape].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
        <g transform={`translate(50 50) rotate(${rotation}) scale(${scale}) translate(-50 -50)`}>
          {filled ? (
            <>
              <rect x={4} y={4} width={92} height={92} rx={14} fill="#ffffff" stroke="var(--line)" strokeWidth={2.5} />
              <g transform="translate(12 12) scale(0.76)">{drawObject(shape, inkFor(seed))}</g>
            </>
          ) : (
            <g transform="translate(8 8) scale(0.84)">{drawObject(shape, inkFor(seed, "var(--fg)"))}</g>
          )}
        </g>
      </svg>
    );
  }
  const paint = filled ? { fill: "var(--fg)" } : { fill: "none", stroke: "var(--fg)", strokeWidth: 3 };
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false">
      <g transform={`translate(24 24) rotate(${rotation}) scale(${scale}) translate(-24 -24)`} {...paint}>
        {shape === "circle" && <circle cx="24" cy="24" r="14" />}
        {shape === "square" && <rect x="10" y="10" width="28" height="28" />}
        {shape === "oval" && <ellipse cx="24" cy="24" rx="17" ry="11" />}
        {shape === "rounded" && <rect x="10" y="10" width="28" height="28" rx="9" />}
        {shape === "triangle" && <polygon points="24,8 40,38 8,38" />}
        {shape === "star" && <polygon points="24,6 29,19 43,19 32,28 36,42 24,34 12,42 16,28 5,19 19,19" />}
      </g>
    </svg>
  );
}

/** Spoken names of the shapes, for accessible labels. */
export const SHAPE_NAMES: Readonly<Record<GridShape, readonly [vi: string, en: string]>> = {
  circle: ["hình tròn", "circle"],
  square: ["hình vuông", "square"],
  triangle: ["hình tam giác", "triangle"],
  star: ["hình ngôi sao", "star"],
  oval: ["hình bầu dục", "oval"],
  rounded: ["hình vuông bo góc", "rounded square"],
};

/** Spoken name of a shape or an illustrated object, in the current language. */
export function subjectName(shape: GridSubject, t: Translate): string {
  if (isArtCategory(shape)) return artLabel(shape, t);
  const names = SHAPE_NAMES[shape];
  return t(names[0], names[1]);
}
