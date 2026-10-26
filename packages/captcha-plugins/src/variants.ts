import { CHECKBOX_VARIANTS } from "./checkbox/variants";
import { DRAG_DROP_VARIANTS } from "./drag-drop/variants";
import { IMAGE_GRID_VARIANTS } from "./image-grid/variants";
import { ROTATION_VARIANTS } from "./rotation/variants";
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
} as const;
