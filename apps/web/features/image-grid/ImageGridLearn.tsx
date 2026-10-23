"use client";

import { useT } from "@/lib/i18n";

/** Short educational content for the Image Grid CAPTCHA. */
export function ImageGridLearn() {
  const t = useT();
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Tìm hiểu: CAPTCHA lưới ảnh", "Learn: the image grid CAPTCHA")}
      </h2>
      <p className="text-muted">
        {t(
          "CaptchaLab minh hoạ các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Nó không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
          "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">
        {t(
          "Bạn thấy chín ảnh và chọn tất cả ảnh khớp với một loại được nêu tên, rồi bấm Xác minh.",
          "You see nine images and select every one that matches a named category, then verify.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách tạo thử thách", "Generation")}</h3>
      <p className="text-muted">
        {t(
          "Bộ sinh ngẫu nhiên theo seed chọn một hình mục tiêu, đặt nó vào hai đến bốn trong chín ô và lấp các ô còn lại bằng hình khác. Các ảnh chỉ là hình SVG đơn giản, không dùng bộ dữ liệu hay mô hình AI. Cùng seed thì ra cùng lưới.",
          "A seeded generator picks a target shape, places it in two to four of the nine cells and fills the rest with other shapes. The images are simple SVG drawings, with no dataset or AI model. The same seed gives the same grid.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách xác minh", "Verification")}</h3>
      <p className="text-muted">
        {t(
          "Chỉ xét đúng sai: các ô được chọn phải đúng bằng các ô có hình mục tiêu, không thiếu và không thừa. Cách bạn chọn không ảnh hưởng đến việc đạt hay chưa đạt.",
          "Correctness only: the selected cells must be exactly the cells showing the target, with none missing and none extra. How you selected never affects pass or fail.",
        )}
      </p>
      <h3 className="font-semibold">{t("Tín hiệu có thể quan sát", "Signals that may be observed")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Thời gian phản ứng, thời gian đến lần chọn đầu tiên và tổng thời gian.", "Reaction time, time to the first selection, and total time.")}</li>
        <li>{t("Nhịp độ: khoảng thời gian giữa các lần bấm.", "Rhythm: the time between toggles.")}</li>
        <li>{t("Bỏ chọn: khi bạn đổi ý.", "Deselections: changing your mind.")}</li>
        <li>{t("Số đợt chọn và cách nhập (con trỏ hoặc bàn phím).", "Rounds of selecting, and input modality (pointer or keyboard).")}</li>
      </ul>
      <p className="text-muted">
        {t(
          "Đây chỉ là mô tả một lần tương tác, không phải quy tắc để phân biệt người với phần mềm.",
          "These are descriptions of one interaction, not rules for telling people from software.",
        )}
      </p>
      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>
          {t(
            "Nhanh với con người, và bộ xác minh chỉ là so sánh hai tập hợp.",
            "Quick for people, and the verifier is a simple set comparison.",
          )}
        </li>
      </ul>
      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>
          {t(
            "Phần mềm phân loại ảnh rất giỏi, nên lưới ảnh chụp thật dần mất giá trị.",
            "Image classification by software is strong, so photo-based grids lose value over time.",
          )}
        </li>
        <li>{t("Ảnh mơ hồ làm người dùng bực mình.", "Ambiguous images frustrate people.")}</li>
      </ul>
      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">
        {t(
          "Ở đây mỗi ô là một nút bật/tắt có nhãn, điều hướng bằng phím mũi tên, và nhãn nêu tên hình. Lưới ảnh thật cần có cách thay thế không dùng thị giác tương đương.",
          "Here each tile is a labelled toggle button with arrow-key navigation, and its label names its shape. Real image grids need an equivalent non-visual alternative.",
        )}
      </p>
      <h3 className="font-semibold">{t("Về việc tự động hoá", "Automation considerations")}</h3>
      <p className="text-muted">
        {t(
          "Vì nhãn nêu tên hình, bản demo này rất dễ với phần mềm. CaptchaLab chỉ nghiên cứu thử thách của chính nó và không tích hợp hay tự động hoá bất kỳ dịch vụ bên thứ ba nào.",
          "Because labels name the shape, this demo is trivial for software. CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party service.",
        )}
      </p>
    </section>
  );
}
