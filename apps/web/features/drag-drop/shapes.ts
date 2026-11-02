import { isArtCategory, type DragItemKind, type ShapeKind } from "@captchalab/captcha-plugins";
import { artLabel } from "@/lib/art/names";
import { EN, type Translate } from "@/lib/i18n";

export const SHAPE_NAME: Record<ShapeKind, string> = {
  circle: "Circle",
  square: "Square",
  triangle: "Triangle",
};

const SHAPE_NAME_VI: Record<ShapeKind, string> = {
  circle: "Hình tròn",
  square: "Hình vuông",
  triangle: "Hình tam giác",
};

const isShape = (kind: DragItemKind): kind is ShapeKind => !isArtCategory(kind);

/** Display name of a shape or object in the current language (English by default). */
export const shapeName = (kind: DragItemKind, t: Translate = EN): string => {
  if (!isShape(kind)) {
    const name = artLabel(kind, t);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return t(SHAPE_NAME_VI[kind], SHAPE_NAME[kind]);
};

/** Same, lower-cased for use inside a sentence (Vietnamese is already lower-case after the first word). */
export const shapeNameLower = (kind: DragItemKind, t: Translate = EN): string => (isShape(kind) ? t(SHAPE_NAME_VI[kind].toLowerCase(), SHAPE_NAME[kind].toLowerCase()) : artLabel(kind, t));
