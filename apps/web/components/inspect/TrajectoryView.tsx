import type { ReactNode } from "react";
import type { TrajectoryGeometry } from "@/lib/inspect/trajectory";

interface Props {
  geometry: TrajectoryGeometry;
  /** Accessible description of what is drawn (caller knows the CAPTCHA's vocabulary). */
  label: string;
  /** Highlights the selected event's position when it has one. */
  selectedPoint?: { x: number; y: number } | null;
  /** Drawn first, under the paths (track, target region, ...). */
  underlay?: ReactNode;
  /** Drawn last, over the paths (virtual cursor, ...). */
  overlay?: ReactNode;
  testId?: string;
  maxHeight?: number;
}

/**
 * Generic trajectory renderer: paths, a circle at the start, a square at the end, optional
 * selection marker, and caller-supplied overlays. It knows nothing about the plugin; callers
 * choose which tracks to draw and what surrounds them. Coordinates are the session's own.
 */
export function TrajectoryView({ geometry, label, selectedPoint, underlay, overlay, testId, maxHeight = 260 }: Props) {
  const vb = geometry.viewBox;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
      className="w-full rounded-md bg-bg ring-1 ring-line"
      style={{ aspectRatio: `${vb.width} / ${vb.height}`, maxHeight }}
      data-testid={testId}
    >
      {underlay}
      {geometry.paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--fg)" strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      {geometry.start && (
        <circle cx={geometry.start.x} cy={geometry.start.y} r={5} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2} />
      )}
      {geometry.end && (
        <rect x={geometry.end.x - 5} y={geometry.end.y - 5} width={10} height={10} fill="var(--fg)" />
      )}
      {selectedPoint && (
        <g data-testid="trajectory-selected" stroke="var(--accent)" strokeWidth={2} fill="none">
          <circle cx={selectedPoint.x} cy={selectedPoint.y} r={8} />
          <path d={`M${selectedPoint.x - 12} ${selectedPoint.y}H${selectedPoint.x + 12}M${selectedPoint.x} ${selectedPoint.y - 12}V${selectedPoint.y + 12}`} />
        </g>
      )}
      {overlay}
    </svg>
  );
}
