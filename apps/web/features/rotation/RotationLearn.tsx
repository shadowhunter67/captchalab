"use client";

import { useT } from "@/lib/i18n";

/** Short educational content for the Image Rotation CAPTCHA. */
export function RotationLearn() {
  const t = useT();
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Tìm hiểu: CAPTCHA xoay ảnh", "Learn: the image rotation CAPTCHA")}
      </h2>
      <p className="text-muted">
        {t(
          "CaptchaLab minh họa các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Nó không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
          "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">
        {t(
          "Một vật thể được hiển thị bị xoay đi một góc. Bạn xoay nó trở lại cho đến khi trông thẳng đứng, bằng cách kéo quanh tâm hoặc dùng phím mũi tên. Thử thách chỉ kiểm tra góc cuối cùng: khoảng cách góc ngắn nhất đến hướng thẳng đứng có nằm trong mức cho phép không? 359° và 1° đều lệch 1° so với thẳng đứng.",
          "An object is shown turned by some angle. You turn it back until it looks upright, by dragging around its centre or with the arrow keys. The challenge checks the final angle only: is the shortest angular distance to upright within the tolerance? 359° and 1° are both 1° from upright.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách tạo thử thách", "Generation")}</h3>
      <p className="text-muted">
        {t(
          "Một bộ sinh theo seed chọn góc xuất phát từ 40° đến 320° (không bao giờ đã thẳng đứng sẵn). Vật thể chỉ là một mũi tên vẽ đơn giản, không dùng tệp ảnh nào.",
          "A seeded generator picks a start angle between 40° and 320° (never already upright). The object is a simple drawn arrow, with no image assets.",
        )}
      </p>
      <h3 className="font-semibold">{t("Xác minh", "Verification")}</h3>
      <p className="text-muted">
        {t(
          "Chỉ xét đúng hay sai. Cách bạn xoay không ảnh hưởng đến kết quả đạt hay chưa đạt.",
          "Correctness only. How you turned it never affects pass or fail.",
        )}
      </p>
      <h3 className="font-semibold">{t("Các tín hiệu có thể được quan sát", "Signals that may be observed")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Thời gian phản ứng, và việc xoay mất bao lâu.", "Reaction time, and how long the rotation took.")}</li>
        <li>{t("Tổng góc đã xoay và vận tốc góc (khi kéo bằng con trỏ).", "Total turning and angular velocity (pointer drags).")}</li>
        <li>{t("Chỉnh lại: đổi chiều xoay, ví dụ xoay vượt quá đích rồi quay lại.", "Corrections: reversals of turning direction, such as overshoot and return.")}</li>
        <li>{t("Sai lệch góc cuối cùng, số lần thử và cách nhập.", "Final angular error, number of attempts, and input modality.")}</li>
      </ul>
      <p className="text-muted">
        {t(
          "Các chỉ số này chỉ mô tả một lần tương tác; chúng không phải quy tắc để phân biệt người với phần mềm.",
          "These describe one interaction; they are not rules for telling people from software.",
        )}
      </p>
      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Trực quan, và cần phán đoán hướng chứ không chỉ một cú nhấp.", "Intuitive, and it needs a judgement about orientation, not just a click.")}</li>
        <li>{t("Dùng được bằng con trỏ, cảm ứng hoặc bàn phím.", "Works with a pointer, touch or keyboard.")}</li>
      </ul>
      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Các bài xác định hướng đơn giản có thể bị thị giác máy tính giải được.", "Simple orientation tasks can be solved by computer vision.")}</li>
        <li>{t("Phụ thuộc vào việc nhìn thấy vật thể; cần có cách thay thế không dùng thị giác.", "Depends on seeing the object; a non-visual alternative is needed.")}</li>
      </ul>
      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">
        {t(
          "Vật thể là một thanh trượt: chọn được bằng bàn phím, góc của nó hiển thị dưới dạng chữ, và xoay bằng phím mũi tên trái và phải. Vì nhiệm vụ là nhận ra hướng bằng mắt, nên không phải ai cũng dùng được.",
          "The object is a slider: focusable, with its angle as text, turned by the left and right arrow keys. Because the task is to recognise orientation visually, it is not accessible to everyone.",
        )}
      </p>
      <h3 className="font-semibold">{t("Lưu ý về tự động hóa", "Automation considerations")}</h3>
      <p className="text-muted">
        {t(
          "Một hình đã biết trước rất dễ tự động hóa. CaptchaLab chỉ nghiên cứu thử thách của chính phòng thí nghiệm này và không tích hợp hay tự động hóa bất kỳ dịch vụ bên thứ ba nào.",
          "A single known shape is easy to automate. CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party service.",
        )}
      </p>
    </section>
  );
}
