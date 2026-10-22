import { formatMetricValue, type InspectMetric } from "@/lib/inspect/metrics";

interface Props {
  /** Visible sub-heading for this group of metrics. */
  heading: string;
  metrics: readonly InspectMetric[];
  /** Muted line shown above the rows (e.g. "no drag was recorded"). */
  notice?: string;
}

/**
 * Renders metric descriptors. It formats by unit and shows "—" for unavailable values; it has no
 * knowledge of any CAPTCHA or of how a metric is computed.
 */
export function MetricTable({ heading, metrics, notice }: Props) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-sm font-semibold">{heading}</h4>
      {notice && <p className="mb-2 text-xs text-muted">{notice}</p>}
      <dl>
        {metrics.map((m) => (
          <div
            key={m.id}
            className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-b-0"
          >
            <dt className="min-w-0 text-sm text-muted" title={m.description}>
              {m.label}
              {m.hint && <span className="ml-1 text-xs">({m.hint})</span>}
            </dt>
            <dd className="shrink-0 font-mono text-sm" data-testid={`metric-${m.id}`}>
              {formatMetricValue(m)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
