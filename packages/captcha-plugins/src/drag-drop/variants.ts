import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface DragDropVariantConfig {
  [key: string]: number;
  /** Item width/height as a fraction of the surface scale. */
  itemSize: number;
  /** Hit radius of a drop area, same scale. */
  dropTolerance: number;
}

export const DRAG_DROP_VARIANTS: CaptchaVariantSet<DragDropVariantConfig> = {
  variants: [
    {
      id: "shape-match",
      name: "Shape match",
      description: "Three shapes onto their matching areas; difficulty shrinks the shapes and the drop areas.",
      difficulties: {
        easy: { itemSize: 0.19, dropTolerance: 0.18 },
        medium: { itemSize: 0.17, dropTolerance: 0.14 },
        hard: { itemSize: 0.15, dropTolerance: 0.1 },
      },
    },
  ],
  defaultSelection: { variantId: "shape-match", difficulty: "medium" },
};
