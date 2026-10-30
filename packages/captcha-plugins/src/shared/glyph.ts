/**
 * The generic look shared by MatchKey and Tile Game: a shape, a fill pattern and an orientation (a small mark on the
 * shape turns with it, so every orientation is visibly different). Drawn by CaptchaLab itself; no outside asset.
 */
export const GLYPH_SHAPES = ["circle", "square", "triangle", "hexagon"] as const;
export const GLYPH_PATTERNS = ["solid", "striped", "dotted"] as const;
export const GLYPH_ORIENTATIONS = [0, 90, 180, 270] as const;

export type GlyphShape = (typeof GLYPH_SHAPES)[number];
export type GlyphPattern = (typeof GLYPH_PATTERNS)[number];
export type GlyphOrientation = (typeof GLYPH_ORIENTATIONS)[number];

/** The three attributes a rule can refer to. */
export const GLYPH_ATTRS = ["shape", "pattern", "orientation"] as const;
export type GlyphAttr = (typeof GLYPH_ATTRS)[number];

export interface GlyphLook {
  shape: GlyphShape;
  pattern: GlyphPattern;
  orientation: GlyphOrientation;
}

/** A look plus a presentational size (never part of any rule). */
export interface Glyph extends GlyphLook {
  id: string;
  scale: number;
}

const VALUES: Readonly<Record<GlyphAttr, readonly (string | number)[]>> = { shape: GLYPH_SHAPES, pattern: GLYPH_PATTERNS, orientation: GLYPH_ORIENTATIONS };
export const valuesOf = (attr: GlyphAttr): readonly (string | number)[] => VALUES[attr];

export function allLooks(): GlyphLook[] {
  const out: GlyphLook[] = [];
  for (const shape of GLYPH_SHAPES) for (const pattern of GLYPH_PATTERNS) for (const orientation of GLYPH_ORIENTATIONS) out.push({ shape, pattern, orientation });
  return out;
}

/** How many of the given attributes differ between two looks. */
export const diffCount = (a: GlyphLook, b: GlyphLook, attrs: readonly GlyphAttr[]): number => attrs.filter((k) => a[k] !== b[k]).length;
export const sameOn = (a: GlyphLook, b: GlyphLook, attrs: readonly GlyphAttr[]): boolean => diffCount(a, b, attrs) === 0;
export const lookKey = (l: GlyphLook): string => `${l.shape}/${l.pattern}/${l.orientation}`;

export function isGlyphLook(v: unknown): v is GlyphLook {
  if (typeof v !== "object" || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    (GLYPH_SHAPES as readonly unknown[]).includes(g.shape) &&
    (GLYPH_PATTERNS as readonly unknown[]).includes(g.pattern) &&
    (GLYPH_ORIENTATIONS as readonly unknown[]).includes(g.orientation)
  );
}

export function shuffled<T>(values: readonly T[], rng: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export const pick = <T>(values: readonly T[], rng: () => number): T => values[Math.min(values.length - 1, Math.floor(rng() * values.length))] as T;

/** Size is presentation only: a few fixed steps keep the rendering readable. */
export const GLYPH_SCALES = [0.85, 1, 1.15] as const;
export const isScale = (v: unknown): boolean => typeof v === "number" && (GLYPH_SCALES as readonly number[]).includes(v);

export const SHAPE_NAME: Readonly<Record<GlyphShape, readonly [vi: string, en: string]>> = {
  circle: ["hình tròn", "circle"],
  square: ["hình vuông", "square"],
  triangle: ["hình tam giác", "triangle"],
  hexagon: ["hình lục giác", "hexagon"],
};
export const PATTERN_NAME: Readonly<Record<GlyphPattern, readonly [vi: string, en: string]>> = {
  solid: ["đặc", "solid"],
  striped: ["kẻ sọc", "striped"],
  dotted: ["chấm bi", "dotted"],
};
export const ORIENTATION_NAME: Readonly<Record<GlyphOrientation, readonly [vi: string, en: string]>> = {
  0: ["dấu hướng lên", "mark up"],
  90: ["dấu hướng phải", "mark right"],
  180: ["dấu hướng xuống", "mark down"],
  270: ["dấu hướng trái", "mark left"],
};
