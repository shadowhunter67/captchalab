"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createRng } from "@captchalab/captcha-core";
import { registry, type SliderChallenge } from "@captchalab/captcha-plugins";
import { parseSeed, randomSeed } from "@/lib/seed";
import { SliderSession } from "./SliderSession";

export function SliderPlayground() {
  // Generated on the client only: no hydration mismatch from random challenges.
  const [seed, setSeed] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    // `?seed=123` makes the challenge deterministic (E2E tests, reproducing a challenge).
    setSeed(parseSeed(window.location.search) ?? randomSeed());
  }, []);

  const generated = useMemo<{ challenge: SliderChallenge | null; failed: boolean }>(() => {
    if (seed === null) return { challenge: null, failed: false };
    try {
      return { challenge: registry.get("slider").generate({ rng: createRng(seed) }), failed: false };
    } catch (err) {
      console.error("Challenge generation failed", err instanceof Error ? err.message : "unknown error");
      return { challenge: null, failed: true };
    }
  }, [seed]);

  const newChallenge = (): void => {
    setSeed(randomSeed());
    setRound((r) => r + 1);
  };

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

      {generated.failed && (
        <p role="alert" className="text-sm text-bad">
          Could not generate a challenge. Reload the page.
        </p>
      )}
      {generated.challenge === null && !generated.failed && <p className="text-sm text-muted">Loading…</p>}
      {generated.challenge && (
        <SliderSession
          key={`${generated.challenge.id}:${round}`}
          challenge={generated.challenge}
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
