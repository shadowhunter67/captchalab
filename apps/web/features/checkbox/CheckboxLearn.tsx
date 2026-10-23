"use client";

import { useT } from "@/lib/i18n";

/** Educational content for the Checkbox CAPTCHA (static; no data leaves the page). */
export function CheckboxLearn() {
  const t = useT();
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Tìm hiểu: CAPTCHA ô đánh dấu", "Learn: the checkbox CAPTCHA")}
      </h2>
      <p className="text-muted">
        {t(
          "CAPTCHA dạng ô đánh dấu có thể chỉ là phần nhìn thấy được của một hệ thống đánh giá rủi ro hoặc thử thách lớn hơn. CaptchaLab minh họa các tín hiệu tương tác mà một hệ thống như vậy có thể quan sát, nhưng không tuyên bố tái tạo cơ chế bên trong của các dịch vụ CAPTCHA thương mại.",
          "A checkbox-style CAPTCHA may be only one visible part of a larger risk or challenge system. CaptchaLab demonstrates interaction signals that such a system could observe, but does not claim to reproduce the internal mechanisms of commercial CAPTCHA services.",
        )}
      </p>

      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">
        {t(
          "Bạn kích hoạt ô đánh dấu bằng con trỏ hoặc bàn phím. Thử thách chỉ được xác minh dựa trên câu trả lời cuối cùng: ô đã được đánh dấu chưa? Bản demo này cũng ghi lại thời gian thao tác ngay trong trình duyệt và hiển thị ở mục Phân tích. Không có gì được tải lên.",
          "You activate the checkbox with a pointer or the keyboard. The challenge is verified from the final answer alone: is the box checked? This demo also records the timing of your input locally in the browser and shows it in Inspect. Nothing is uploaded.",
        )}
      </p>

      <h3 className="font-semibold">{t("Các tín hiệu có thể được quan sát", "Signals that may be observed")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Thời gian đến lần nhấn đầu tiên và đến lần kích hoạt hoàn tất đầu tiên.", "Time to the first press and to the first completed activation.")}</li>
        <li>{t("Thời gian giữ ô (thời gian nhấn).", "How long the control was held (press duration).")}</li>
        <li>{t("Kích hoạt lặp lại (bật/tắt) và thời gian giữa các lần kích hoạt.", "Repeated activation (toggling), and the time between activations.")}</li>
        <li>{t("Cách nhập: chuột, cảm ứng, bút hoặc bàn phím.", "Input modality: mouse, touch, pen or keyboard.")}</li>
        <li>{t("Thứ tự và thời điểm của các sự kiện nhấn, thả và phím bên dưới.", "The order and timing of the underlying press, release and key events.")}</li>
      </ul>
      <p className="text-muted">
        {t(
          "Đây chỉ là mô tả một lần tương tác, không phải quy tắc để phân biệt người với phần mềm, và cũng không phải danh sách đầy đủ những gì một hệ thống thật xem xét.",
          "These are descriptions of one interaction, not rules for telling people from software, and not a complete list of what a real system looks at.",
        )}
      </p>

      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Gần như không gây phiền cho người dùng.", "Very little friction for the user.")}</li>
        <li>
          {t(
            "Dễ tiếp cận khi dùng ô đánh dấu gốc có ngữ nghĩa (tên, trạng thái, bàn phím).",
            "Accessible when built from a native, semantic checkbox (name, state, keyboard).",
          )}
        </li>
        <li>{t("Hữu ích làm điểm vào dễ thấy trong một hệ thống rộng hơn.", "Useful as a visible entry point in a broader system.")}</li>
      </ul>

      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>
          {t(
            "Một ô đánh dấu đứng riêng chẳng chứng minh được gì: rất dễ kích hoạt bằng chương trình.",
            "A checkbox on its own proves nothing: it is trivial to activate programmatically.",
          )}
        </li>
        <li>
          {t(
            "Mọi sự bảo vệ đến từ hệ thống và ngữ cảnh xung quanh, không phải từ chính ô đánh dấu.",
            "Any security comes from the wider system and context around it, not from the box.",
          )}
        </li>
      </ul>

      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">
        {t(
          "Trang này dùng ô đánh dấu gốc: có tên truy cập được, thể hiện trạng thái đã/chưa đánh dấu, nhận tiêu điểm bàn phím (Tab) và bật/tắt bằng Space (không phải Enter, như mọi ô đánh dấu gốc). Kết quả được hiển thị bằng chữ, không chỉ bằng màu. Các hệ thống thật có thể thêm những bước khác khó dùng hơn.",
          "This page uses a native checkbox: it has an accessible name, exposes checked/unchecked, takes keyboard focus (Tab) and toggles with Space (not Enter, as for any native checkbox). The result is text, not only color. Real systems may add further steps that are harder to use.",
        )}
      </p>

      <h3 className="font-semibold">{t("Lưu ý về tự động hóa", "Automation considerations")}</h3>
      <p className="text-muted">
        {t(
          "Một ô đánh dấu đơn giản tự nó rất dễ bị tự động hóa. CaptchaLab dùng nó để nghiên cứu tương tác và cách ghi nhận. Dự án không tích hợp hay tự động hóa bất kỳ dịch vụ bên thứ ba nào.",
          "A simple checkbox by itself is easy to automate. CaptchaLab uses it to study interaction and instrumentation. It does not integrate with, or automate, any third-party service.",
        )}
      </p>

      <h3 className="font-semibold">{t("Giới hạn của bản mô phỏng này", "Limits of this simulation")}</h3>
      <p className="text-muted">
        {t(
          "Bộ xác minh chạy ngay trong trình duyệt của bạn và chỉ là bản minh họa, không phải biện pháp bảo vệ dùng cho thực tế. CaptchaLab minh họa các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Dự án không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
          "The verifier runs in your browser and is a demonstration, not production protection. CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
        )}
      </p>
    </section>
  );
}
