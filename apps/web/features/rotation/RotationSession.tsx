"use client";

import { useRef, useState } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type Point, type VerificationResult } from "@captchalab/captcha-core";
import { registry, type RotationChallenge, type RotationFeatures } from "@captchalab/captcha-plugins";
import { RotationController } from "./rotation-controller";
import { RotationInspect } from "./RotationInspect";
import { RotationSurface } from "./RotationSurface";

interface Completed {
  submission: number;
  session: InteractionSession;
  center: Point;
  verification: VerificationResult;
  featureSet: FeatureSet<RotationFeatures>;
}

interface Props {
  challenge: RotationChallenge;
  onNewChallenge: () => void;
}

/** One challenge = one session (the parent keys it by challenge). Turning again clears the result. */
export function RotationSession({ challenge: initialChallenge, onNewChallenge }: Props) {
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("rotation");
  const applyAngleRef = useRef<(angle: number) => void>(() => {});
  const submissionsRef = useRef(0);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [controller] = useState(() => {
    const recorder = createEventRecorder({ captchaId: plugin.id });
    return new RotationController({
      recorder,
      challenge,
      onAngle: (a) => applyAngleRef.current(a),
      onInput: () => {
        setCompleted(null);
        setError(null);
      },
      onVerify: (answer, center) => {
        try {
          const session = recorder.snapshot();
          const verification = plugin.verify(challenge, answer, session);
          const featureSet = plugin.extractFeatures(challenge, session, { center });
          submissionsRef.current += 1;
          setCompleted({ submission: submissionsRef.current, session, center, verification, featureSet });
          setError(null);
        } catch (err) {
          console.error("Rotation submission failed", err instanceof Error ? err.message : "unknown error");
          setError("Could not analyze this attempt. Start a new challenge.");
        }
      },
    });
  });

  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          Try
        </h2>
        <p className="mb-4 text-sm text-muted">
          Turn the object until the arrow points up. Drag it around its center, or focus it (Tab) and use the left and
          right arrow keys (5° per press). Then press Verify.
        </p>
        <RotationSurface controller={controller} applyAngleRef={applyAngleRef} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => controller.verify()}
            data-testid="verify"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={onNewChallenge}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
          >
            New challenge
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Accessibility: the object is a slider you can turn with a pointer or the arrow keys; its angle is exposed as
          text and the result is stated in words. Seeing the arrow is still required, so this is not accessible to
          everyone, and it is a demonstration, not a production CAPTCHA.
        </p>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && (
        <RotationInspect
          key={completed.submission}
          challenge={challenge}
          verification={completed.verification}
          featureSet={completed.featureSet}
          session={completed.session}
          center={completed.center}
        />
      )}
    </div>
  );
}
