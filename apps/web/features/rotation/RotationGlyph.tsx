import type { RotationSubject } from "@captchalab/captcha-plugins";
import { ArtTile } from "@/lib/art/ArtTile";

/**
 * The thing to turn. Classic variants: an arrow with a base bar, so "upright" (pointing up) is unambiguous. The picture
 * variant: a round crop of one of CaptchaLab's own scenes, whose sky and ground show which way is up. Decorative.
 */
export function RotationGlyph({ size, subject }: { size: number; subject?: RotationSubject | undefined }) {
  if (subject) {
    return (
      <div aria-hidden="true" className="overflow-hidden rounded-full ring-2 ring-line" style={{ width: size, height: size }}>
        <ArtTile category={subject.category} seed={subject.seed} scene={subject.category === "airplane" ? "sky" : "park"} className="h-full w-full" />
      </div>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx={50} cy={50} r={46} fill="var(--panel)" stroke="var(--line)" strokeWidth={2} />
      <polygon points="50,10 74,46 58,46 58,78 42,78 42,46 26,46" fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} strokeLinejoin="round" />
      <rect x={32} y={80} width={36} height={7} rx={3} fill="var(--fg)" />
    </svg>
  );
}
