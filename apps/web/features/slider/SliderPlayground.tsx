"use client";

import Link from "next/link";
import { createRng } from "@captchalab/captcha-core";
import { VARIANT_SETS, registry } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { ChallengeControls } from "@/components/ChallengeControls";
import { ChallengeConfigProvider } from "@/components/inspect/ChallengeConfigCard";
import { stampSeed, useSeededChallenge, type VariantChoice } from "@/lib/useSeededChallenge";
import { SliderSession } from "./SliderSession";

const generateSlider = (seed: number, choice: VariantChoice) =>
  stampSeed(registry.get("slider").generate({ rng: createRng(seed), variantId: choice.variantId, difficulty: choice.difficulty }), seed);

export function SliderPlayground() {
  const t = useT();
  const { challenge, failed, round, newChallenge, choice, seed, setVariant, setDifficulty, setSeed } = useSeededChallenge(
    generateSlider,
    VARIANT_SETS["slider"],
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("CAPTCHA thanh trượt", "Slider CAPTCHA")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Thử làm thử thách, rồi xem các sự kiện nó tạo ra. Dữ liệu thao tác thô không bao giờ rời khỏi thẻ trình duyệt này.",
            "Try the challenge, then inspect the events it produced. Raw interaction data never leaves this browser tab.",
          )}
        </p>
      </header>

      <ChallengeControls
        captcha="slider"
        variantSet={VARIANT_SETS["slider"]}
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
        <ChallengeConfigProvider captcha="slider" config={challenge.config}>
          <SliderSession
          key={`${challenge.id}:${round}`}
          challenge={challenge}
          onNewChallenge={newChallenge}
        />
        </ChallengeConfigProvider>
      )}

      <details className="rounded-lg border border-line bg-panel p-4 text-sm">
        <summary className="cursor-pointer font-medium">{t("Cách hoạt động và giới hạn", "How it works and its limits")}</summary>
        <div className="mt-2 space-y-2 text-muted">
          <p>
            {t(
              "Vị trí đích nằm trong khoảng 25% đến 90% đường đi của tay nắm, được chọn từ một bộ sinh ngẫu nhiên có hạt giống. Bạn đạt nếu thả trong phạm vi ±2% đường đi quanh đích. Các sự kiện con trỏ của bạn được chuẩn hoá về định dạng sự kiện của CaptchaLab; phần Phân tích được tính từ đó.",
              "A target position between 25% and 90% of the handle's travel is chosen from a seeded generator. You pass if you release within ±2% of travel of it. Your pointer events are normalized into CaptchaLab's event format; the Inspect panel is computed from them.",
            )}
          </p>
          <p>
            {t(
              "Hình học: tay nắm được coi là nằm chính giữa dưới con trỏ khi bạn kéo. Nếu cửa sổ bị đổi kích thước trong lúc kéo, lần thử đó sẽ bị huỷ.",
              "Geometry: the handle is assumed to be centered under the pointer while you drag. If the window is resized during a drag, that attempt is cancelled.",
            )}
          </p>
          <p>
            {t(
              "CaptchaLab minh hoạ các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Nó không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
              "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
            )}
          </p>
        </div>
      </details>
    </main>
  );
}
