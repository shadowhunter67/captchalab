/** The object to turn: an arrow with a base bar, so "upright" (pointing up) is unambiguous. Decorative. */
export function RotationGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx={50} cy={50} r={46} fill="var(--panel)" stroke="var(--line)" strokeWidth={2} />
      <polygon points="50,10 74,46 58,46 58,78 42,78 42,46 26,46" fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} strokeLinejoin="round" />
      <rect x={32} y={80} width={36} height={7} rx={3} fill="var(--fg)" />
    </svg>
  );
}
