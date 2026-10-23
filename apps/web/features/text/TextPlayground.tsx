"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { registry } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { useSeededChallenge } from "@/lib/useSeededChallenge";
import { TextLearn } from "./TextLearn";
import { TextSession } from "./TextSession";

const generateText = (seed: number) => registry.get("text").generate({ rng: createRng(seed) });

export function TextPlayground() {
  const t = useT();
  const { challenge, failed, round, newChallenge } = useSeededChallenge(generateText);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Text CAPTCHA</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Hãy thử thử thách, rồi phân tích các sự kiện nó tạo ra. Dữ liệu tương tác thô không bao giờ rời khỏi thẻ trình duyệt này.",
            "Try the challenge, then inspect the events it produced. Raw interaction data never leaves this browser tab.",
          )}
        </p>
      </header>
      {failed && (
        <p role="alert" className="text-sm text-bad">
          {t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge && <TextSession key={`${challenge.id}:${round}`} challenge={challenge} onNewChallenge={newChallenge} />}
      <TextLearn />
    </main>
  );
}
