import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface DragDropVariantConfig {
  [key: string]: number;
  /** Item width/height as a fraction of the surface scale. */
  itemSize: number;
  /** Hit radius of a drop area, same scale. */
  dropTolerance: number;
  /** 1: the items are illustrated objects and the drop areas their silhouettes; 0: plain shapes. */
  objects?: number;
}

export const DRAG_DROP_VARIANTS: CaptchaVariantSet<DragDropVariantConfig> = {
  variants: [
    {
      id: "shape-match",
      name: "Shape match",
      description: "Three shapes onto their matching areas; difficulty shrinks the shapes and the drop areas.",
      difficulties: {
        easy: { itemSize: 0.19, dropTolerance: 0.18, objects: 0 },
        medium: { itemSize: 0.17, dropTolerance: 0.14, objects: 0 },
        hard: { itemSize: 0.15, dropTolerance: 0.1, objects: 0 },
      },
    },
    {
      id: "object-silhouette",
      name: "Objects and silhouettes",
      description: "Three pictured objects onto the silhouettes of the same objects; difficulty shrinks the cards and the drop areas.",
      difficulties: {
            easy: { itemSize: 0.2, dropTolerance: 0.18, objects: 1 },
            medium: { itemSize: 0.18, dropTolerance: 0.14, objects: 1 },
            hard: { itemSize: 0.16, dropTolerance: 0.1, objects: 1 },
      },
    },
  ],
  defaultSelection: { variantId: "shape-match", difficulty: "medium" },
};
