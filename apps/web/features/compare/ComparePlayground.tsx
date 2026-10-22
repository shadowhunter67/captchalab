"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { createRng } from "@captchalab/captcha-core";
import { registry, type SliderChallenge } from "@captchalab/captcha-plugins";
import { Card } from "@/components/inspect/Card";
import { TrajectoryView } from "@/components/inspect/TrajectoryView";
import { buildSliderTrajectory } from "@/features/slider/slider-view-data";
import { SliderSession, type SliderResult } from "@/features/slider/SliderSession";
import {
  DEFAULT_SYNTHETIC_LAYOUT,
  PROFILE_DESCRIPTIONS,
  PROFILE_LABELS,
  SYNTHETIC_PROFILES,
  generateSyntheticSliderSession,
  type SyntheticProfile,
} from "@/lib/synthetic/slider-synthetic";
import { useSeededChallenge } from "@/lib/useSeededChallenge";
import { compareRows } from "./compare-data";

const generateSlider = (seed: number) => registry.get("slider").generate({ rng: createRng(seed) });
const TRACK_HEIGHT = 44;

function Trajectory({ result, challenge, label, testId }: { result: SliderResult; challenge: SliderChallenge; label: string; testId: string }) {
  const view = useMemo(
    () => buildSliderTrajectory(result.session, result.layout, challenge, TRACK_HEIGHT),
    [result, challenge],
  );
  return (
    <TrajectoryView
      geometry={view.geometry}
      label={label}
      testId={testId}
      maxHeight={160}
      underlay={
        <>
          <rect x={view.track.x} y={view.track.y} width={view.track.width} height={view.track.height} fill="var(--track)" />
          <rect x={view.targetRegion.x} y={view.targetRegion.y} width={view.targetRegion.width} height={view.targetRegion.height} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
        </>
      }
    />
  );
}

function CompareBody({ challenge, onNewChallenge }: { challenge: SliderChallenge; onNewChallenge: () => void }) {
  const slider = registry.get("slider");
  const [human, setHuman] = useState<SliderResult | null>(null);
  const [profile, setProfile] = useState<SyntheticProfile>("eased");
  const [variant, setVariant] = useState(1);
  const onResult = useCallback((r: SliderResult) => setHuman(r), []);

  // The synthetic session uses the human's layout when there is one, so both are measured in the same space.
  const layout = human?.layout ?? DEFAULT_SYNTHETIC_LAYOUT;
  const synthetic = useMemo<SliderResult | null>(() => {
    try {
      const session = generateSyntheticSliderSession({ profile, challenge, layout, seed: variant });
      return {
        session,
        layout,
        featureSet: slider.extractFeatures(challenge, session, { layout }),
        verification: slider.verify(challenge, { position: challenge.target }, session),
      };
    } catch (err) {
      console.error("Synthetic session failed", err instanceof Error ? err.message : "unknown error");
      return null;
    }
  }, [profile, challenge, layout, variant, slider]);

  const rows = useMemo(
    () => compareRows(human?.featureSet.features ?? null, synthetic?.featureSet.features ?? null),
    [human, synthetic],
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby="human-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="human-h" className="mb-1 text-base font-semibold">
          1. Your attempt
        </h2>
        <p className="mb-4 text-sm text-muted">Drag the handle to the dashed outline and release. It is recorded locally, like in the Slider playground. The target is shown visually only; the synthetic side below works without making an attempt.</p>
        <SliderSession challenge={challenge} onNewChallenge={onNewChallenge} onResult={onResult} onReset={() => setHuman(null)} showInspect={false} />
      </section>

      <section aria-labelledby="synthetic-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="synthetic-h" className="mb-1 text-base font-semibold">
          2. Synthetic profile
        </h2>
        <p className="mb-3 text-sm text-muted">
          A synthetic session is generated data: a valid interaction record fed to the same feature extractors. No browser event
          is created or dispatched, and nothing is sent anywhere.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Synthetic profile</legend>
          {SYNTHETIC_PROFILES.map((p) => (
            <label key={p} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="profile"
                value={p}
                checked={profile === p}
                data-testid={`profile-${p}`}
                onChange={() => setProfile(p)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{PROFILE_LABELS[p]}</span> <span className="text-muted">{PROFILE_DESCRIPTIONS[p]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {profile === "noisy" && (
          <button type="button" data-testid="regenerate" onClick={() => setVariant((v) => v + 1)} className="mt-3 rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
            Generate another noisy variant
          </button>
        )}
      </section>

      <section aria-labelledby="result-h" className="space-y-4" data-testid="compare-result">
        <h2 id="result-h" className="text-base font-semibold">
          3. Differences
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card id="human-traj-h" title="Your trajectory">
            {human ? (
              <Trajectory result={human} challenge={challenge} label="Your drag" testId="traj-human" />
            ) : (
              <p className="text-sm text-muted" data-testid="human-empty">Make an attempt above to see it here.</p>
            )}
          </Card>
          <Card id="syn-traj-h" title={`Synthetic trajectory (${PROFILE_LABELS[profile]})`}>
            {synthetic ? (
              <Trajectory result={synthetic} challenge={challenge} label={`Synthetic ${profile} drag`} testId="traj-synthetic" />
            ) : (
              <p role="alert" className="text-sm text-bad">Could not generate the synthetic session.</p>
            )}
          </Card>
        </div>
        <Card id="table-h" title="Measured dimensions">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="compare-table">
              <caption className="sr-only">Measured dimensions of your attempt and the synthetic session</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-1 pr-3 font-medium">Dimension</th>
                  <th scope="col" className="py-1 pr-3 font-medium">You</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Synthetic ({PROFILE_LABELS[profile]})</th>
                  <th scope="col" className="py-1 font-medium">Synthetic minus you</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/50" data-testid={`row-${r.id}`}>
                    <th scope="row" className="py-1 pr-3 font-normal" title={r.description}>{r.label}</th>
                    <td className="py-1 pr-3 font-mono" data-testid={`human-${r.id}`}>{r.left}</td>
                    <td className="py-1 pr-3 font-mono" data-testid={`synthetic-${r.id}`}>{r.right}</td>
                    <td className="py-1 font-mono" data-testid={`diff-${r.id}`}>{r.difference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted" data-testid="compare-note">
            These are differences between two recordings, not a classification. CaptchaLab does not compute a bot score and does
            not claim that any of these values separates people from software; a person can drag in a straight line and a program
            can add noise. Only the Slider is used here.
          </p>
        </Card>
      </section>
    </div>
  );
}

export function ComparePlayground() {
  const { challenge, failed, round, newChallenge } = useSeededChallenge(generateSlider);
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Compare: human and synthetic</h1>
        <p className="mt-1 text-sm text-muted">
          Drag the Slider yourself, then pick a synthetic profile and look at how the measured features differ. Everything runs in
          this browser tab on CaptchaLab&apos;s own challenge.
        </p>
      </header>
      {failed && (
        <p role="alert" className="text-sm text-bad">
          Could not generate a challenge. Reload the page.
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">Loading…</p>}
      {challenge && <CompareBody key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />}
    </main>
  );
}
