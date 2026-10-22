"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { useSeededChallenge } from "@/lib/useSeededChallenge";
import { SliderSession } from "./SliderSession";

const generateSlider = (seed: number) => registry.get("slider").generate({ rng: createRng(seed) });

export function SliderPlayground() {
  const { challenge, failed, round, newChallenge } = useSeededChallenge(generateSlider);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Slider CAPTCHA</h1>
        <p className="mt-1 text-sm text-muted">
          Try the challenge, then inspect the events it produced. Raw interaction data never leaves this
          browser tab.
        </p>
      </header>

      {failed && (
        <p role="alert" className="text-sm text-bad">
          Could not generate a challenge. Reload the page.
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">Loading…</p>}
      {challenge && (
        <SliderSession
          key={`${challenge.id}:${round}`}
          challenge={challenge}
          onNewChallenge={newChallenge}
        />
      )}

      <details className="rounded-lg border border-line bg-panel p-4 text-sm">
        <summary className="cursor-pointer font-medium">How it works and its limits</summary>
        <div className="mt-2 space-y-2 text-muted">
          <p>
            A target position between 25% and 90% of the handle&apos;s travel is chosen from a seeded generator.
            You pass if you release within ±2% of travel of it. Your pointer events are normalized into
            CaptchaLab&apos;s event format; the Inspect panel is computed from them.
          </p>
          <p>
            Geometry: the handle is assumed to be centered under the pointer while you drag. If the window is
            resized during a drag, that attempt is cancelled.
          </p>
          <p>
            CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the
            complete internal mechanisms of commercial CAPTCHA systems.
          </p>
        </div>
      </details>
    </main>
  );
}
