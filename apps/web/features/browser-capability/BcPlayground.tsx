"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { VARIANT_SETS, registry } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { CaptchaLearn } from "@/components/CaptchaLearn";
import { ChallengeControls } from "@/components/ChallengeControls";
import { ChallengeConfigProvider } from "@/components/inspect/ChallengeConfigCard";
import { stampSeed, useSeededChallenge, type VariantChoice } from "@/lib/useSeededChallenge";
import { BcSession } from "./BcSession";

const generateBc = (seed: number, choice: VariantChoice) =>
  stampSeed(registry.get("browser-capability").generate({ rng: createRng(seed), variantId: choice.variantId, difficulty: choice.difficulty }), seed);

export function BcPlayground() {
  const t = useT();
  const { challenge, failed, round, newChallenge, choice, seed, setVariant, setDifficulty, setSeed } = useSeededChallenge(generateBc, VARIANT_SETS["browser-capability"]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">CaptchaLab</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Kiểm tra khả năng trình duyệt", "Browser Capability check")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("Xem trình duyệt có những API cơ bản nào, chỉ ở dạng có hoặc không. Dữ liệu thô không bao giờ rời khỏi thẻ trình duyệt này.", "See which basic APIs the browser offers, as plain yes or no. Raw data never leaves this browser tab.")}
        </p>
      </header>
      <ChallengeControls captcha="browser-capability" variantSet={VARIANT_SETS["browser-capability"]} choice={choice} seed={seed} onVariant={setVariant} onDifficulty={setDifficulty} onSeed={setSeed} />
      {failed && <p role="alert" className="text-sm text-bad">{t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}</p>}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge && (
        <ChallengeConfigProvider captcha="browser-capability" config={challenge.config}>
          <BcSession key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />
        </ChallengeConfigProvider>
      )}
      <CaptchaLearn id="browser-capability" />
    </main>
  );
}
