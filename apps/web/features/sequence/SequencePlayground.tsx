"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { VARIANT_SETS, registry } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { CaptchaLearn } from "@/components/CaptchaLearn";
import { ChallengeControls } from "@/components/ChallengeControls";
import { ChallengeConfigProvider } from "@/components/inspect/ChallengeConfigCard";
import { stampSeed, useSeededChallenge, type VariantChoice } from "@/lib/useSeededChallenge";
import { SequenceSession } from "./SequenceSession";

const generateSequence = (seed: number, choice: VariantChoice) =>
  stampSeed(registry.get("sequence").generate({ rng: createRng(seed), variantId: choice.variantId, difficulty: choice.difficulty }), seed);

export function SequencePlayground() {
  const t = useT();
  const { challenge, failed, round, newChallenge, choice, seed, setVariant, setDifficulty, setSeed } = useSeededChallenge(
    generateSequence,
    VARIANT_SETS["sequence"],
  );
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("CAPTCHA dãy quy luật", "Sequence CAPTCHA")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Hãy thử thử thách, rồi phân tích các sự kiện nó tạo ra. Dữ liệu tương tác thô không bao giờ rời khỏi thẻ trình duyệt này.",
            "Try the challenge, then inspect the events it produced. Raw interaction data never leaves this browser tab.",
          )}
        </p>
      </header>
      <ChallengeControls
        captcha="sequence"
        variantSet={VARIANT_SETS["sequence"]}
        choice={choice}
        seed={seed}
        onVariant={setVariant}
        onDifficulty={setDifficulty}
        onSeed={setSeed}
      />
      {failed && (
        <p role="alert" className="text-sm text-bad">
          {t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge && (
        <ChallengeConfigProvider captcha="sequence" config={challenge.config}>
          <SequenceSession key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />
        </ChallengeConfigProvider>
      )}
      <CaptchaLearn id="sequence" />
    </main>
  );
}
