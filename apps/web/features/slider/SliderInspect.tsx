import type { FeatureSet, InteractionSession, VerificationResult } from "@captchalab/captcha-core";
import type { SubmitVia } from "./slider-controller";
import type { SliderFeatures } from "@captchalab/captcha-plugins";
import { formatCount, formatMilliseconds, formatPixels, formatVelocity } from "@/lib/format";

interface Props {
  verification: VerificationResult;
  featureSet: FeatureSet<SliderFeatures>;
  session: InteractionSession;
  via: SubmitVia;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-sm text-muted">
        {label}
        {hint && <span className="ml-1 text-xs">({hint})</span>}
      </dt>
      <dd className="font-mono text-sm" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Thin Inspect: presents plugin outputs only. Correctness (verification) and behavior
 * (features) are shown separately; features never influence the result.
 */
export function SliderInspect({ verification, featureSet, session, via }: Props) {
  const f = featureSet.features;
  const keyboardOnly = f.numberOfAttempts === 0;
  return (
    <section aria-labelledby="inspect-h" className="rounded-lg border border-line bg-panel p-4">
      <h3 id="inspect-h" className="mb-3 text-base font-semibold">
        Inspect
      </h3>

      <div
        role="status"
        aria-live="polite"
        data-testid="result"
        className="mb-4 rounded-md border border-line p-3"
      >
        <p className={`text-lg font-semibold ${verification.passed ? "text-ok" : "text-bad"}`}>
          <span aria-hidden="true">{verification.passed ? "✓ " : "✗ "}</span>
          Result: {verification.passed ? "Passed" : "Not passed"}
        </p>
        <p className="mt-1 text-sm text-muted">{verification.reason}</p>
        <p className="mt-1 text-xs text-muted">
          Correctness only: |position − target| ≤ tolerance. Behavioral features below do not affect it.
        </p>
      </div>

      <h4 className="mb-1 text-sm font-semibold">Slider attempt (final completed drag)</h4>
      {via === "keyboard" && !keyboardOnly && (
        <p className="mb-2 text-xs text-muted">
          This submission used the keyboard. The drag metrics below come from an earlier pointer attempt in
          this session.
        </p>
      )}
      {keyboardOnly && (
        <p className="mb-2 text-xs text-muted">
          No pointer drag was recorded (keyboard interaction), so drag metrics are not available.
        </p>
      )}
      <dl>
        <Row label="Drag duration" value={formatMilliseconds(f.dragDuration)} />
        <Row label="Release error" value={formatPixels(f.releaseError)} hint="along handle travel" />
        <Row label="Overshoot" value={formatPixels(f.overshoot)} hint="past the target" />
        <Row label="Number of attempts" value={formatCount(f.numberOfAttempts)} />
      </dl>

      <h4 className="mb-1 mt-4 text-sm font-semibold">Whole session (pointer motion)</h4>
      <dl>
        <Row label="Event count" value={formatCount(f.eventCount)} />
        <Row label="Session time" value={formatMilliseconds(f.completionTime)} hint="since challenge shown" />
        <Row label="Pointer distance" value={formatPixels(f.pointerDistance)} />
        <Row label="Mean velocity" value={formatVelocity(f.meanVelocity)} />
        <Row label="Max velocity" value={formatVelocity(f.maxVelocity)} />
        <Row label="Direction changes" value={formatCount(f.directionChanges)} />
      </dl>

      <p className="mt-4 text-xs text-muted">
        Feature set <span className="font-mono">{featureSet.schemaVersion}</span> · extractor{" "}
        <span className="font-mono">{featureSet.extractorVersion}</span> · input: {session.inputModality}.
        These are descriptive measurements of this one interaction, not evidence that it was made by a person
        or by software. Data stays in this browser tab.
      </p>
    </section>
  );
}
