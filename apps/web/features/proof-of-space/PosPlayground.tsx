"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { VARIANT_SETS, registry } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { CaptchaLearn } from "@/components/CaptchaLearn";
import { ChallengeControls } from "@/components/ChallengeControls";
import { ChallengeConfigProvider } from "@/components/inspect/ChallengeConfigCard";
import { stampSeed, useSeededChallenge, type VariantChoice } from "@/lib/useSeededChallenge";
import { PosSession } from "./PosSession";

const generatePos = (seed: number, choice: VariantChoice) =>
  stampSeed(registry.get("proof-of-space").generate({ rng: createRng(seed), variantId: choice.variantId, difficulty: choice.difficulty }), seed);

export function PosPlayground() {
  const t = useT();
  const { challenge, failed, round, newChallenge, choice, seed, setVariant, setDifficulty, setSeed } = useSeededChallenge(generatePos, VARIANT_SETS["proof-of-space"]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">CaptchaLab</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("CAPTCHA bằng chứng không gian", "Proof of Space CAPTCHA")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("Hãy chạy phép tính, rồi xem số đo của nó. Dữ liệu thô không bao giờ rời khỏi thẻ trình duyệt này.", "Run the computation, then inspect its measurements. Raw data never leaves this browser tab.")}
        </p>
      </header>
      <ChallengeControls captcha="proof-of-space" variantSet={VARIANT_SETS["proof-of-space"]} choice={choice} seed={seed} onVariant={setVariant} onDifficulty={setDifficulty} onSeed={setSeed} />
      {failed && <p role="alert" className="text-sm text-bad">{t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}</p>}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge && (
        <ChallengeConfigProvider captcha="proof-of-space" config={challenge.config}>
          <PosSession key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />
        </ChallengeConfigProvider>
      )}
      <CaptchaLearn id="proof-of-space" />
    </main>
  );
}
