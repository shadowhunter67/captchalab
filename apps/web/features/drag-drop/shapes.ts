import type { ShapeKind } from "@captchalab/captcha-plugins";
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

/** Display name of a shape in the current language (English by default). */
export const shapeName = (kind: ShapeKind, t: Translate = EN): string => t(SHAPE_NAME_VI[kind], SHAPE_NAME[kind]);

/** Same, lower-cased for use inside a sentence (Vietnamese is already lower-case after the first word). */
export const shapeNameLower = (kind: ShapeKind, t: Translate = EN): string =>
  t(SHAPE_NAME_VI[kind].toLowerCase(), SHAPE_NAME[kind].toLowerCase());
