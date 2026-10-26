"use client";

import { useT } from "@/lib/i18n";

/** The research disclaimer that every Behavioral Lab page carries. */
export function ResearchDisclaimer({ testId = "research-disclaimer" }: { testId?: string }) {
  const t = useT();
  return (
    <p className="rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid={testId}>
      {t(
        "CaptchaLab minh hoạ các tín hiệu hành vi mà CAPTCHA hoặc hệ thống chống lạm dụng có thể xem xét. Bộ phân loại thử nghiệm chỉ được huấn luyện hoặc cấu hình cho các tương tác thí nghiệm do CaptchaLab sinh ra và không được hiểu là bằng chứng một người là người thật hay một chương trình tự động.",
        "CaptchaLab demonstrates behavioral signals that CAPTCHA or anti-abuse systems may consider. The experimental classifier is trained or configured only for CaptchaLab-generated lab interactions and must not be interpreted as proof that a person is human or automated.",
      )}
    </p>
  );
}

/** Why a "synthetic-like" or "human-like" reading can be wrong, in both directions. */
export function ErrorsNote({ testId = "errors-note" }: { testId?: string }) {
  const t = useT();
  return (
    <div className="space-y-2 text-sm text-muted" data-testid={testId}>
      <p>
        {t(
          "Một người thật có thể trông giống mô phỏng (ví dụ kéo thẳng và đều, hoặc bấm rất nhanh), và một mô phỏng có thể trông giống người (ví dụ thêm nhiễu và độ trễ). Cả hai kiểu nhầm đều xảy ra, nên kết quả luôn có vùng \"Chưa rõ\".",
          "A real person can look synthetic (for example a straight, even drag or a very fast click), and a synthetic sample can look human-like (for example one with added noise and delay). Both mistakes happen, which is why the result always has an \"Uncertain\" zone.",
        )}
      </p>
      <p>
        {t(
          "Thiết bị, công cụ hỗ trợ, khác biệt về vận động, độ trễ mạng hoặc kết xuất, và cách nhập (chuột, cảm ứng, bút, bàn phím) đều ảnh hưởng đến hành vi. Không có suy luận nào về sức khoẻ được rút ra từ chúng.",
          "Device, assistive tools, motor differences, network or render timing and the input method (mouse, touch, pen, keyboard) all affect behavior. No health inference is drawn from any of it.",
        )}
      </p>
    </div>
  );
}
