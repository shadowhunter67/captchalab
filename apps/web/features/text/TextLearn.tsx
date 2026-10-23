"use client";

import { useT } from "@/lib/i18n";

/** Short educational content for the Text CAPTCHA. */
export function TextLearn() {
  const t = useT();
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Tìm hiểu: CAPTCHA văn bản", "Learn: the text CAPTCHA")}
      </h2>
      <p className="text-muted">
        {t(
          "CaptchaLab minh họa các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Dự án không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
          "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">
        {t(
          "Bạn đọc một chuỗi ký tự ngắn bị méo rồi gõ lại. Thử thách so sánh những gì bạn gõ với chuỗi đó.",
          "You read a short distorted string and type it. The challenge compares what you typed with the string.",
        )}
      </p>
      <h3 className="font-semibold">{t("Tạo ảnh", "Generation")}</h3>
      <p className="text-muted">
        {t(
          "Bộ tạo có hạt giống (seed) chọn sáu ký tự từ bảng chữ không có ký tự dễ nhầm (không có 0/O, 1/I/l), rồi xoay nhẹ và dịch lên xuống từng ký tự, thêm vài đường nhiễu. Cùng một seed cho ra cùng một ảnh.",
          "A seeded generator picks six characters from an alphabet without look-alikes (no 0/O, 1/I/l), then gives each one a small rotation and vertical shift and adds a few noise lines. The same seed gives the same image.",
        )}
      </p>
      <h3 className="font-semibold">{t("Xác minh", "Verification")}</h3>
      <p className="text-muted">
        {t(
          "Chỉ xét đúng sai: văn bản bạn gõ, sau khi cắt khoảng trắng thừa và không phân biệt hoa thường, phải trùng với chuỗi. Cách bạn gõ không bao giờ ảnh hưởng đến kết quả đạt hay chưa đạt.",
          "Correctness only: the typed text, trimmed and compared case-insensitively, must equal the string. How you typed never affects pass or fail.",
        )}
      </p>
      <h3 className="font-semibold">{t("Các tín hiệu có thể được quan sát", "Signals that may be observed")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Thời gian phản ứng và thời gian đến ký tự đầu tiên; tổng thời gian.", "Reaction time and time to the first character; total time.")}</li>
        <li>{t("Nhịp gõ: thời gian giữa các ký tự.", "Rhythm: the time between characters.")}</li>
        <li>{t("Sửa lỗi: Backspace và Delete sau khi đã gõ.", "Corrections: Backspace and Delete after typing.")}</li>
        <li>{t("Các lần dừng, các lần thử lặp lại và cách nhập.", "Pauses and repeated attempts, and input modality.")}</li>
      </ul>
      <p className="text-muted">
        {t(
          "Quyền riêng tư: bản ghi chỉ lưu loại phím (Letter, Digit, Backspace…), không bao giờ lưu bạn đã nhấn chữ hay số nào, và văn bản bạn gõ chỉ được đọc một lần để xác minh rồi không giữ lại. Đây là mô tả một lần tương tác, không phải quy tắc để phân biệt người với phần mềm.",
          "Privacy: the recording stores key classes (Letter, Digit, Backspace…), never which letter or digit was pressed, and the typed text is read once to verify and not kept. These are descriptions of one interaction, not rules for telling people from software.",
        )}
      </p>
      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Quen thuộc và rẻ; dùng được với mọi bàn phím.", "Familiar and cheap; works with any keyboard.")}</li>
      </ul>
      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>
          {t(
            "Các công nghệ nhận dạng ký tự quang học và mô hình thị giác hiện đại đọc tốt chữ méo đơn giản.",
            "Modern optical character recognition and vision models read simple distorted text well.",
          )}
        </li>
        <li>
          {t(
            "Nhiều người khó đọc, và ở đây không có gì đọc được nếu không nhìn thấy.",
            "Hard to read for many people, and nothing here is readable without sight.",
          )}
        </li>
      </ul>
      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">
        {t(
          "Ô nhập có nhãn và dùng được bằng bàn phím, nhưng nhiệm vụ cần có thị lực và bản demo này không có lựa chọn thay thế bằng âm thanh hay văn bản. Đừng xem đây là dễ tiếp cận.",
          "The field is labelled and keyboard-operable, but the task needs vision and this demo offers no audio or text alternative. Do not treat it as accessible.",
        )}
      </p>
      <h3 className="font-semibold">{t("Lưu ý về tự động hóa", "Automation considerations")}</h3>
      <p className="text-muted">
        {t(
          "Trong bản demo này, các ký tự là văn bản SVG thuần nên phần mềm đọc rất dễ; hệ thống thật vẽ thành điểm ảnh. CaptchaLab chỉ nghiên cứu thử thách của riêng mình và không tích hợp hay tự động hóa bất kỳ dịch vụ bên thứ ba nào.",
          "In this demo the characters are plain SVG text, so they are trivial for software to read; real systems render pixels. CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party service.",
        )}
      </p>
    </section>
  );
}
