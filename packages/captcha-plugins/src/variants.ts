import { CHECKBOX_VARIANTS } from "./checkbox/variants";
import { DRAG_DROP_VARIANTS } from "./drag-drop/variants";
import { IMAGE_GRID_VARIANTS } from "./image-grid/variants";
import { MATH_LOGIC_VARIANTS } from "./math-logic/variants";
import { ROTATION_VARIANTS } from "./rotation/variants";
import { SEQUENCE_VARIANTS } from "./sequence/variants";
import { SHAPE_MATCHING_VARIANTS } from "./shape-matching/variants";
import { SLIDER_VARIANTS } from "./slider/variants";
import { TEXT_VARIANTS } from "./text/variants";

/** Variant sets by plugin id, for the UI. Each plugin's own generator reads the same set. */
export const VARIANT_SETS = {
  slider: SLIDER_VARIANTS,
  checkbox: CHECKBOX_VARIANTS,
  "drag-drop": DRAG_DROP_VARIANTS,
  rotation: ROTATION_VARIANTS,
  text: TEXT_VARIANTS,
  "image-grid": IMAGE_GRID_VARIANTS,
  "shape-matching": SHAPE_MATCHING_VARIANTS,
  "math-logic": MATH_LOGIC_VARIANTS,
  sequence: SEQUENCE_VARIANTS,
} as const;
