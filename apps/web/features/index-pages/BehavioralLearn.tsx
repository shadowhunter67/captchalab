"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-muted">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/**
 * Learn section for behavioral / invisible CAPTCHA. It is a lab module, not a 13th challenge: nothing here is
 * solved or answered, so it lives apart from the per-CAPTCHA entries of the catalog.
 */
export function BehavioralLearn() {
  const t = useT();
  return (
    <section id="behavioral" aria-labelledby="behavioral-h" className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn-behavioral">
      <h2 id="behavioral-h" className="text-lg font-semibold">
        {t("CAPTCHA hành vi / vô hình", "Behavioral / Invisible CAPTCHA")}
      </h2>
      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">
        {t(
          "Thay vì đưa ra một câu đố, hệ thống quan sát cách người dùng tương tác (thời gian, chuyển động, nhịp, chỉnh sửa) và đánh giá xem có cần thêm thử thách hay không. Người dùng có thể không thấy bước này, nên gọi là “vô hình”.",
          "Instead of posing a puzzle, the system observes how the user interacts (timing, motion, rhythm, corrections) and decides whether a further challenge is needed. The user may never see this step, hence “invisible”.",
        )}
      </p>
      <h3 className="font-semibold">{t("Tín hiệu hành vi", "Behavioral signals")}</h3>
      <List
        items={[
          t("Thời gian: phản ứng, hoàn thành, thời gian giữ, khoảng cách giữa các lần bấm hoặc phím.", "Timing: reaction, completion, press duration, gaps between clicks or keys."),
          t("Chuyển động: quãng đường, vận tốc và mức biến thiên của nó, độ thẳng, vận tốc góc.", "Motion: distance, velocity and how much it varies, straightness, angular velocity."),
          t("Chỉnh sửa và nhịp: đổi hướng, vượt đích, xoá ký tự, độ đều của các mẫu và khoảng dừng.", "Correction and rhythm: direction changes, overshoot, deleted characters, how regular samples and pauses are."),
        ]}
      />
      <h3 className="font-semibold">{t("Leo thang theo rủi ro", "Risk-based challenge escalation")}</h3>
      <p className="text-muted">
        {t(
          "Một hệ thống dựa trên rủi ro có thể bỏ qua thử thách khi tín hiệu có vẻ bình thường và chỉ đưa ra thử thách khi tín hiệu mơ hồ hoặc bất thường. CaptchaLab chỉ mô phỏng gợi ý này trên một trang riêng: không chặn, không chuyển hướng và không phải công cụ đánh giá rủi ro dùng thật.",
          "A risk-based system may skip a challenge when signals look ordinary and present one only when they are unclear or unusual. CaptchaLab only simulates that suggestion on a page of its own: nothing is blocked or redirected, and it is not a production risk engine.",
        )}
      </p>
      <h3 className="font-semibold">{t("Tính không chắc chắn", "Uncertainty")}</h3>
      <p className="text-muted">
        {t(
          "Hành vi chỉ cho bằng chứng, không phải bằng chứng quyết định. Vì vậy bộ phân loại thử nghiệm của CaptchaLab luôn có kết quả “Chưa rõ” và không bao giờ đưa ra phần trăm.",
          "Behavior gives evidence, not proof. That is why CaptchaLab's experimental classifier always has an “Uncertain” outcome and never shows a percentage.",
        )}
      </p>
      <h3 className="font-semibold">{t("Dương tính giả và âm tính giả", "False positives and false negatives")}</h3>
      <List
        items={[
          t("Dương tính giả: một người thật trông giống mô phỏng (kéo thẳng, bấm rất nhanh, dùng công cụ hỗ trợ hoặc bàn phím).", "False positive: a real person who looks synthetic (a straight drag, a very fast click, assistive tools or a keyboard)."),
          t("Âm tính giả: một mẫu mô phỏng trông giống người vì đã thêm nhiễu và độ trễ.", "False negative: a synthetic sample that looks human-like because noise and delay were added."),
          t("Thiết bị, khác biệt về vận động, độ trễ mạng và cách nhập đều ảnh hưởng đến hành vi; không suy ra điều gì về sức khoẻ.", "Device, motor differences, network timing and input method all affect behavior; nothing about health is inferred."),
        ]}
      />
      <h3 className="font-semibold">{t("Quyền riêng tư", "Privacy")}</h3>
      <p className="text-muted">
        {t(
          "Giám sát hành vi có thể xâm phạm quyền riêng tư nếu theo dõi cả trang hoặc giữ lâu dài. Phòng thí nghiệm này chỉ ghi trong một nhiệm vụ riêng, cục bộ, không lưu, không gửi đi và không dùng dấu vân tay thiết bị.",
          "Behavior monitoring can intrude on privacy when it follows a whole site or is kept long term. This lab records only inside one dedicated task, locally, stores nothing, sends nothing and uses no device fingerprint.",
        )}
      </p>
      <h3 className="font-semibold">{t("Dữ liệu có nhãn và đánh giá", "Labeled data and evaluation")}</h3>
      <p className="text-muted" data-testid="learn-labeled">
        {t(
          "Nhãn không phải là kết quả của bộ phân loại. Nhãn là điều một người nói về một phiên (người, mô phỏng hoặc chưa rõ); kết quả của bộ phân loại là một quan sát riêng. Chúng có thể khác nhau, và chính sự khác nhau đó là thứ cần đo. Chỉ khi có dữ liệu được gán nhãn một cách có chủ đích mới có thể nói về độ chính xác, và nhãn do người dùng đặt cũng chưa phải là sự thật đã được xác minh. Vì vậy CaptchaLab hiện chỉ chuẩn bị bộ dữ liệu, chưa tính độ chính xác.",
          "A label is not the classifier's output. A label is what a person says about a session (human, synthetic or unknown); the classifier's reading is a separate observation. They can disagree, and that disagreement is exactly what needs measuring. Only data that was labeled on purpose can support any statement about accuracy, and a user-provided label is still not verified ground truth. So CaptchaLab for now only prepares the dataset and computes no accuracy.",
        )}
      </p>
      <h3 className="font-semibold">{t("Giới hạn", "Limitations")}</h3>
      <List
        items={[
          t("Bộ phân loại là bộ quy tắc đặt tay, không học từ dữ liệu người thật, nên không có độ chính xác để báo cáo.", "The classifier is a hand-set rule baseline not learned from real people, so there is no accuracy to report."),
          t("Chỉ hợp lệ cho dữ liệu thí nghiệm do CaptchaLab sinh ra; không chứng minh một người dùng thật là người hay là chương trình.", "It is valid only for CaptchaLab-generated lab data; it does not prove whether a real user is human or automated."),
        ]}
      />
      <p>
        <Link href="/behavior" className="underline" data-testid="learn-behavioral-link">
          {t("Mở phòng thí nghiệm hành vi", "Open the Behavioral Lab")}
        </Link>
      </p>
    </section>
  );
}
