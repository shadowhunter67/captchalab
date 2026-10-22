import { memo, useId, useMemo } from "react";
import type { SeriesSample } from "@captchalab/captcha-core";
import { buildChartModel, describeSeries, type ChartSize } from "@/lib/inspect/chart";

interface Props {
  title: string;
  /** Shown on the axis and in the text alternative, e.g. "px/s". */
  unit: string;
  segments: readonly (readonly SeriesSample[])[];
  /** Time range of the x axis (ms on the session clock); null when there is nothing to plot. */
  xDomain: readonly [number, number] | null;
  /** Force 0 into the y domain (always for velocity; signed series include it when crossing zero). */
  includeZero: boolean;
  /** Vertical marker at the selected event's time. */
  selectedT?: number | null;
  formatValue: (v: number) => string;
  testId: string;
  /** Short note under the chart about what data it shows. */
  scopeNote?: string;
}

// Narrow viewBox: it is scaled down on phones, so labels stay legible.
const SIZE: ChartSize = { width: 400, height: 170, margin: { top: 10, right: 14, bottom: 30, left: 54 } };

/**
 * Pure-SVG time-series chart. Segments are separate lines (never joined across gestures);
 * single samples are dots. Has a text alternative that states the value range.
 */
function MotionChartImpl({ title, unit, segments, xDomain, includeZero, selectedT, formatValue, testId, scopeNote }: Props) {
  const uid = useId();
  const lo = xDomain ? xDomain[0] : 0;
  const hi = xDomain ? xDomain[1] : 1;
  // The selection crosshair does not recompute the scales or paths.
  const model = useMemo(() => buildChartModel(segments, [lo, hi], SIZE, includeZero), [segments, lo, hi, includeZero]);
  const summary = useMemo(() => describeSeries(title, unit, segments, formatValue), [title, unit, segments, formatValue]);
  const { plot } = model;
  const selX =
    selectedT !== null && selectedT !== undefined && selectedT >= model.xDomain[0] && selectedT <= model.xDomain[1]
      ? model.scaleX(selectedT)
      : null;

  return (
    <figure className="min-w-0" data-testid={testId}>
      <figcaption id={`${uid}-t`} className="mb-1 text-sm font-semibold">
        {title} <span className="font-normal text-muted">({unit})</span>
      </figcaption>
      {model.empty ? (
        <p className="rounded-md bg-bg p-3 text-sm text-muted ring-1 ring-line" id={`${uid}-d`}>
          {summary}
        </p>
      ) : (
        <>
          <svg
            role="img"
            aria-labelledby={`${uid}-t`}
            aria-describedby={`${uid}-d`}
            viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
            className="mx-auto w-full max-w-2xl rounded-md bg-bg ring-1 ring-line"
          >
            {model.yTicks.map((t) => (
              <g key={`y${t.value}`}>
                <line x1={plot.left} x2={plot.right} y1={t.pos} y2={t.pos} stroke="var(--line)" strokeWidth={1} />
                <text x={plot.left - 6} y={t.pos + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
                  {formatValue(t.value)}
                </text>
              </g>
            ))}
            {model.zeroY !== null && (
              <line
                data-testid={`${testId}-zero`}
                x1={plot.left}
                x2={plot.right}
                y1={model.zeroY}
                y2={model.zeroY}
                stroke="var(--muted)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
            {model.xTicks.map((t, i) => (
              <text
                key={`x${t.value}`}
                x={t.pos}
                y={SIZE.height - 9}
                textAnchor={i === 0 ? "start" : i === model.xTicks.length - 1 ? "end" : "middle"}
                fontSize={12}
                fill="var(--muted)"
              >
                {(t.value / 1000).toFixed(2)} s
              </text>
            ))}
            {model.paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
            ))}
            {model.dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={3} fill="var(--accent)" />
            ))}
            {selX !== null && (
              <line x1={selX} x2={selX} y1={plot.top} y2={plot.bottom} stroke="var(--fg)" strokeWidth={1.5} data-testid={`${testId}-selected`} />
            )}
          </svg>
          <p id={`${uid}-d`} className="mt-1 text-xs text-muted" data-testid={`${testId}-summary`}>
            {summary}
          </p>
        </>
      )}
      {scopeNote && <p className="mt-1 text-xs text-muted">{scopeNote}</p>}
    </figure>
  );
}

export const MotionChart = memo(MotionChartImpl);
