"use client";

import { useT } from "@/lib/i18n";

/** Educational content for the Drag & Drop CAPTCHA (static; no data leaves the page). */
export function DragDropLearn() {
  const t = useT();
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t("Tìm hiểu: CAPTCHA kéo thả", "Learn: the drag and drop CAPTCHA")}
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
          "Bạn kéo từng hình vào vùng thả có cùng hình dạng. Khi mọi hình đã được đặt, thử thách chỉ kiểm tra vị trí cuối cùng: mỗi hình có nằm đúng vùng của nó không? Các sự kiện con trỏ của bạn được chuẩn hóa, giữ trong thẻ trình duyệt này và hiển thị ở phần Phân tích.",
          "You drag each shape onto the drop area that matches it. When every shape is placed, the challenge checks the final placements only: is each shape on its matching area? Your pointer events are normalized, kept in this browser tab, and shown in Inspect.",
        )}
      </p>

      <h3 className="font-semibold">{t("Cách tạo thử thách", "How the challenge is generated")}</h3>
      <p className="text-muted">
        {t(
          "Một bộ sinh theo seed đặt ba hình và ba vùng thả thành hai hàng, xáo trộn hình nào thuộc vùng nào, và dịch nhẹ vị trí xuất phát. Mọi vị trí đều là tỉ lệ của bảng, nên cùng một thử thách vừa với mọi kích cỡ màn hình. Cùng một seed luôn cho cùng một thử thách.",
          "A seeded generator places three shapes and three drop areas in two rows, shuffles which shape belongs where, and nudges the starting positions. All positions are fractions of the board, so the same challenge fits any screen size. The same seed always gives the same challenge.",
        )}
      </p>

      <h3 className="font-semibold">{t("Quy tắc thả", "Drop rule")}</h3>
      <p className="text-muted">
        {t(
          "Tâm của hình (không phải con trỏ) được kiểm tra với vòng tròn của từng vùng thả. Hình thả lên một vùng sẽ khớp vào vùng đó, kể cả vùng sai (hình đang ở đó sẽ quay về chỗ xuất phát), còn thả ở nơi khác thì hình quay về. Khoảng lệch giữa chỗ bạn nắm và tâm hình được giữ nguyên, nên hình không bị nhảy khỏi con trỏ.",
          "The centre of the shape (not the pointer) is tested against each drop area's circle. A shape released on an area snaps to it, even a wrong one (a shape already there goes back to its start), and a release anywhere else sends it back. You keep the offset between where you grabbed the shape and its centre, so it does not jump under the pointer.",
        )}
      </p>

      <h3 className="font-semibold">{t("Các tín hiệu có thể được quan sát", "Signals that may be observed")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Thời gian phản ứng đến lần kéo đầu tiên, và tổng thời gian hoàn thành.", "Reaction time to the first drag, and total time to finish.")}</li>
        <li>{t("Thời gian kéo và độ dài đường đi của mỗi lần thử.", "Drag duration and path length per attempt.")}</li>
        <li>{t("Tốc độ thay đổi dọc theo mỗi lần kéo, và số lần đổi hướng (chỉnh lại).", "Speed changes along each drag, and direction changes (corrections).")}</li>
        <li>{t("Thả sai, kéo bị hủy và các lần thử lặp lại.", "Failed drops, cancelled drags and repeated attempts.")}</li>
        <li>{t("Mỗi hình được thả cách tâm đích bao xa.", "How far from the target centre each shape was released.")}</li>
      </ul>
      <p className="text-muted">
        {t(
          "Các chỉ số này chỉ mô tả một lần tương tác. Chúng không phải quy tắc để phân biệt người với phần mềm, và không phải danh sách đầy đủ những gì một hệ thống thật xem xét.",
          "These describe one interaction. They are not rules for telling people from software and not a complete list of what a real system looks at.",
        )}
      </p>

      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Trực quan, và cần suy luận không gian cùng chuyển động liên tục thay vì chỉ một cú nhấp.", "Intuitive, and it exercises spatial reasoning and continuous movement rather than a single click.")}</li>
        <li>{t("Cho dữ liệu tương tác phong phú hơn ô đánh dấu.", "Produces richer interaction data than a checkbox.")}</li>
      </ul>

      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>{t("Việc ghép hình đơn giản có thể bị phần mềm giải được bằng cách đọc trang hoặc dùng thị giác máy tính.", "Simple shape matching can be solved by software that reads the page or uses computer vision.")}</li>
        <li>{t("Kéo có thể khó hoặc không thể với một số người (khuyết tật vận động, màn hình nhỏ).", "Dragging can be hard or impossible for some people (motor impairments, small screens).")}</li>
        <li>{t("Tự nó chưa đủ để chống lạm dụng mạnh.", "On its own it is not enough for strong anti-abuse protection.")}</li>
      </ul>

      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">
        {t(
          "Thử thách này cần con trỏ. Phiên bản này chưa có cách thay thế bằng bàn phím, nên người chỉ dùng bàn phím không thể hoàn thành, và trình đọc màn hình chỉ nghe được tên và trạng thái bằng lời chứ không di chuyển được các hình. Một thiết kế bàn phím (chọn hình, chuyển giữa các vùng, đặt xuống) nằm trong danh sách cần làm; nó cần mô hình tương tác riêng chứ không bắt chước việc kéo.",
          "This challenge depends on a pointer. There is no keyboard alternative in this version, so keyboard-only users cannot complete it, and screen readers get names and state in words but no way to move the shapes. A keyboard design (select a shape, move between areas, place it) is on the backlog; it would need its own interaction model rather than imitating dragging.",
        )}
      </p>

      <h3 className="font-semibold">{t("Lưu ý về tự động hóa", "Automation considerations")}</h3>
      <p className="text-muted">
        {t(
          "Hình học đơn giản như thế này có thể tự động hóa được. CaptchaLab chỉ nghiên cứu thử thách của chính phòng thí nghiệm này; nó không tích hợp hay tự động hóa bất kỳ dịch vụ bên thứ ba nào.",
          "Simple geometry like this is automatable. CaptchaLab studies only its own lab challenge; it does not integrate with or automate any third-party service.",
        )}
      </p>
    </section>
  );
}
