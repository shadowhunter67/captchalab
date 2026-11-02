"use client";

import { useLang, useT } from "@/lib/i18n";

/** The slider's own notes. Standalone it sits under the challenge; in the home page's frame the shell's Learn tab shows it instead. */
export function SliderLearn() {
  const t = useT();
  const { embedded } = useLang();
  if (embedded) return null;
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Cách hoạt động và giới hạn", "How it works and its limits")}
      </h2>
      <div className="space-y-2 text-muted">
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
    </section>
  );
}
