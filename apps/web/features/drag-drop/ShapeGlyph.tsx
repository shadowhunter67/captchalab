import type { ShapeKind } from "@captchalab/captcha-plugins";

interface BodyProps {
  kind: ShapeKind;
  /** Outline only (what a drop area shows) instead of a solid item. */
  outline: boolean;
}

/** The shape in a 100 x 100 box. Shape, not color, tells items apart. */
function ShapeBody({ kind, outline }: BodyProps) {
  const paint = outline
    ? { fill: "none", stroke: "var(--muted)", strokeWidth: 5, strokeDasharray: "9 7" }
    : { fill: "var(--accent)", stroke: "var(--bg)", strokeWidth: 4 };
  return (
    <>
      {kind === "circle" && <circle cx={50} cy={50} r={40} {...paint} />}
      {kind === "square" && <rect x={12} y={12} width={76} height={76} rx={6} {...paint} />}
      {kind === "triangle" && <polygon points="50,10 90,86 10,86" strokeLinejoin="round" {...paint} />}
    </>
  );
}

/** Decorative HTML-embedded shape (the accessible name is on the element that holds it). */
export function ShapeGlyph({ kind, size, outline = false }: { kind: ShapeKind; size: number; outline?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <ShapeBody kind={kind} outline={outline} />
    </svg>
  );
}

/** The same shape as an SVG group, for drawing inside another SVG (the replay stage). */
export function ShapeMark({
  kind,
  size,
  outline = false,
  x,
  y,
  groupRef,
  testId,
}: {
  kind: ShapeKind;
  size: number;
  outline?: boolean;
  /** Center. For items that move every frame, the replay overrides `transform` through `groupRef`. */
  x: number;
  y: number;
  groupRef?: (el: SVGGElement | null) => void;
  testId?: string;
}) {
  return (
    <g
      {...(groupRef ? { ref: groupRef } : {})}
      {...(testId ? { "data-testid": testId } : {})}
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})`}
    >
      <ShapeBody kind={kind} outline={outline} />
    </g>
  );
}
