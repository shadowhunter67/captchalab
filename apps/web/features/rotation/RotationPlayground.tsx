"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { useSeededChallenge } from "@/lib/useSeededChallenge";
import { RotationLearn } from "./RotationLearn";
import { RotationSession } from "./RotationSession";

const generateRotation = (seed: number) => registry.get("rotation").generate({ rng: createRng(seed) });

export function RotationPlayground() {
  const { challenge, failed, round, newChallenge } = useSeededChallenge(generateRotation);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Image Rotation CAPTCHA</h1>
        <p className="mt-1 text-sm text-muted">
          Try the challenge, then inspect the events it produced. Raw interaction data never leaves this browser tab.
        </p>
      </header>
      {failed && (
        <p role="alert" className="text-sm text-bad">
          Could not generate a challenge. Reload the page.
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">Loading…</p>}
      {challenge && <RotationSession key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />}
      <RotationLearn />
    </main>
  );
}
