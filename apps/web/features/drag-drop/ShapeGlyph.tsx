import { isArtCategory, type DragItemKind } from "@captchalab/captcha-plugins";
import { drawObject, inkFor } from "@/lib/art/draw";

interface BodyProps {
  kind: DragItemKind;
  /** Outline only (what a drop area shows) instead of a solid item. */
  outline: boolean;
}

/** The shape in a 100 x 100 box. Shape, not color, tells items apart. */
/** A stable picture seed for an object kind, so an item and its replay copy are the same drawing. */
const seedOf = (kind: string): number => [...kind].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function ShapeBody({ kind, outline }: BodyProps) {
  if (isArtCategory(kind)) {
    // An object card (a pictured object on a soft card) or, as a drop area, the silhouette of the same object.
    return outline ? (
      <>
        <rect x={5} y={5} width={90} height={90} rx={14} fill="none" stroke="var(--muted)" strokeWidth={3} strokeDasharray="8 6" />
        <g transform="translate(14 14) scale(0.72)" opacity={0.5}>
          {drawObject(kind, inkFor(seedOf(kind), "var(--muted)"))}
        </g>
      </>
    ) : (
      <>
        <rect x={4} y={4} width={92} height={92} rx={14} fill="#ffffff" stroke="var(--line)" strokeWidth={2.5} />
        <g transform="translate(12 12) scale(0.76)">{drawObject(kind, inkFor(seedOf(kind)))}</g>
      </>
    );
  }
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
export function ShapeGlyph({ kind, size, outline = false }: { kind: DragItemKind; size: number; outline?: boolean }) {
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
  kind: DragItemKind;
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
