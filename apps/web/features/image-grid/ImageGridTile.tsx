import type { GridCell, GridShape } from "@captchalab/captcha-plugins";
import { isArtCategory } from "@captchalab/captcha-plugins";
import { ArtTile } from "@/lib/art/ArtTile";

/** A plain shape (the shape variants) or one of CaptchaLab's own illustrations (the picture variants): no bitmap, no dataset, no model. */
export function ImageGridTile({ cell }: { cell: GridCell }) {
  if (isArtCategory(cell.shape)) {
    return <ArtTile category={cell.shape} seed={cell.art ?? 0} extras={cell.extras ?? []} className="h-full w-full" />;
  }
  const shape: GridShape = cell.shape;
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false">
      {shape === "circle" && <circle cx="24" cy="24" r="14" fill="var(--fg)" />}
      {shape === "square" && <rect x="10" y="10" width="28" height="28" fill="var(--fg)" />}
      {shape === "oval" && <ellipse cx="24" cy="24" rx="17" ry="11" fill="var(--fg)" />}
      {shape === "rounded" && <rect x="10" y="10" width="28" height="28" rx="9" fill="var(--fg)" />}
      {shape === "triangle" && <polygon points="24,8 40,38 8,38" fill="var(--fg)" />}
      {shape === "star" && <polygon points="24,6 29,19 43,19 32,28 36,42 24,34 12,42 16,28 5,19 19,19" fill="var(--fg)" />}
    </svg>
  );
}
