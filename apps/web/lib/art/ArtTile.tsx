import { createRng } from "@captchalab/captcha-core";
import { ART_HABITAT, type ArtCategory, type ArtScene } from "@captchalab/captcha-plugins";
import { drawObject, drawScene, inkFor, sceneFor } from "./draw";

/** Objects with a clear left/right facing, which a picture may mirror without becoming a different object. */
const FLIPPABLE: readonly ArtCategory[] = ["bus", "car", "dog", "bird", "boat", "airplane", "bicycle", "cat"];

interface Props {
  category: ArtCategory;
  seed: number;
  /** Other objects far behind the main one (a scene tile). They never include the target of a challenge unless it is the main one. */
  extras?: readonly ArtCategory[];
  scene?: ArtScene;
  /** One flat colour, no scene: a shape to match or to drop onto. */
  silhouette?: boolean;
  /** Rotation of the whole picture, degrees (Rotation challenge). */
  rotate?: number;
  className?: string;
}

/**
 * One of CaptchaLab's own illustrations, drawn from (category, seed). Decorative: it is always aria-hidden, so the name of
 * a challenge tile never says what is drawn (the accessible name is only "Image 3 of 9"); the alternative for people who
 * cannot see is another challenge, not a caption.
 */
export function ArtTile({ category, seed, extras = [], scene, silhouette = false, rotate = 0, className }: Props) {
  if (silhouette) {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
        {drawObject(category, inkFor(seed, "currentColor"))}
      </svg>
    );
  }
  const rng = createRng(seed ^ 0x9e37);
  const flip = FLIPPABLE.includes(category) && rng() < 0.5 ? -1 : 1;
  const s = 0.86 + rng() * 0.14;
  const dx = (rng() - 0.5) * 8;
  const ground = ART_HABITAT[category] === "ground";
  const where = scene ?? sceneFor(category, rng);
  const specks = Array.from({ length: 12 }, () => [rng() * 100, rng() * 100, 0.4 + rng() * 0.9] as const);
  const back: readonly [number, number][] = [[20, 60], [80, 58], [50, 54]];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
      {drawScene(where, seed)}
      {extras.map((c, i) => {
        const [x, y] = back[i % back.length] as [number, number];
        return (
          <g key={`${c}${i}`} transform={`translate(${x} ${y}) scale(0.42) translate(-50 -50)`} opacity="0.95">
            {drawObject(c, inkFor(seed + 17 * (i + 1)))}
          </g>
        );
      })}
      <g transform={`translate(${50 + dx} ${ground ? 52 : 50}) scale(${flip * s} ${s}) translate(-50 -50)`}>{drawObject(category, inkFor(seed))}</g>
      {specks.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.12" />
      ))}
    </svg>
  );
}
