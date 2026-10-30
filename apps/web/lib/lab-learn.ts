import type { Translate } from "@/lib/i18n";
import type { LabId } from "@/lib/taxonomy";

/** Learn text of the composed labs. Short on purpose: what it is, how it is built, what it measures, what it does not prove. */
export interface LabLearn {
  what: string;
  how: string;
  measures: string;
  notProve: string;
  privacy: string;
  limits: string;
}

export function labLearnFor(id: LabId, t: Translate): LabLearn {
  const common = {
    privacy: t(
      "Mọi thứ chạy trong thẻ trình duyệt này: không gửi đi, không lưu, không phân tích từ xa. Không dùng micro và không lấy dấu vân tay.",
      "Everything runs in this browser tab: nothing is sent, stored or analysed remotely. No microphone and no fingerprinting.",
    ),
  };
  switch (id) {
    case "hybrid-pow-visual":
    case "hybrid-pow-audio": {
      const second = id === "hybrid-pow-visual" ? t("thanh trượt", "slider") : t("chữ số nghe được", "spoken digits");
      return {
        what: t(
          `Một thử thách lai ghép hai chặng: một bằng chứng công việc (máy bạn tính một phép băm) rồi một thử thách tương tác (${second}). Hệ thống thật hay dùng cách này để vừa làm tốn tài nguyên của kẻ gửi hàng loạt, vừa hỏi một việc mà người dễ làm.`,
          `A challenge in two stages: a proof of work (your device computes a hash), then an interactive challenge (${second}). Real systems combine them to make bulk requests cost resources while also asking for something people find easy.`,
        ),
        how: t(
          "Mỗi chặng do plugin của nó tạo và xác minh. Một quy tắc duy nhất ghép chúng: chỉ đạt khi cả hai chặng đạt cho đúng thử thách hiện tại. Chặng 2 bị khoá cho đến khi chặng 1 hợp lệ; kết quả của thử thách cũ không bao giờ được tính.",
          "Each stage is made and verified by its own plugin. One rule joins them: it passes only when both stages pass for the current challenge. Stage 2 stays locked until stage 1 is valid, and an outcome about an older challenge never counts.",
        ),
        measures: t(
          "Số liệu phép tính (số lần băm) nằm ở chặng 1; số liệu tương tác nằm ở chặng 2. Hai bảng Inspect riêng, không trộn.",
          "Computation numbers (hashes) stay with stage 1; interaction numbers stay with stage 2. Two separate Inspect panels, never mixed.",
        ),
        notProve: t(
          "Một chương trình tính được băm và giải được chặng 2 vẫn qua. Kết quả không chứng minh người dùng là con người.",
          "A program that computes the hash and solves stage 2 passes too. The result does not prove a human user.",
        ),
        limits: t(
          "Chỉ có hai kiểu lai. Hai chặng không được ghi thành một phiên chung, và bộ phân loại hành vi không đọc lab này.",
          "Only two kinds exist. The two stages are not recorded as one session, and the behavioral classifier does not read this lab.",
        ),
        ...common,
      };
    }
    case "invisible":
      return {
        what: t(
          "Mô phỏng ý tưởng CAPTCHA “vô hình”: thay vì câu đố, hệ thống quan sát cách bạn tương tác trong một nhiệm vụ trung tính (bấm vào mục tiêu đang dời chỗ).",
          "A simulation of the “invisible” CAPTCHA idea: instead of a puzzle, the system watches how you interact during a neutral task (click a target that moves).",
        ),
        how: t(
          "Chỉ sau khi bấm Bắt đầu, và chỉ trong khung riêng của trang này, các sự kiện được ghi lại trong bộ nhớ. Dừng khi xong hoặc khi bạn bấm Dừng. Bộ phân loại thử nghiệm hiện có đọc các tín hiệu và đưa ra một nhãn.",
          "Only after you press Start, and only inside this page's own pad, events are recorded in memory. Recording stops when the run ends or when you press Stop. The existing experimental classifier reads the signals and gives a label.",
        ),
        measures: t(
          "Thời gian giữa các lần bấm, độ thẳng và tốc độ di chuyển, số lần bấm trượt. Các tín hiệu thiếu (ví dụ khi dùng bàn phím) được ghi là thiếu, không phải bằng 0.",
          "Time between clicks, straightness and speed of movement, missed clicks. Signals that do not exist (for example with a keyboard) are shown as missing, not as zero.",
        ),
        notProve: t(
          "Nhãn “giống người”, “giống mô phỏng” hay “chưa chắc” chỉ là một quan sát thử nghiệm trên dữ liệu của CaptchaLab. Nó không chứng minh ai đó là người hay là phần mềm.",
          "A “human-like”, “synthetic-like” or “uncertain” label is an experimental observation on CaptchaLab's own data. It does not prove that someone is a person or software.",
        ),
        limits: t(
          "Bộ phân loại là luật viết tay, chưa được huấn luyện trên người thật. Người dùng bàn phím hay công nghệ hỗ trợ có thể bị đọc sai; vì vậy lab này không chặn ai.",
          "The classifier is hand-written rules, not trained on real people. Keyboard or assistive-technology users can be misread, which is why this lab blocks no one.",
        ),
        ...common,
      };
    case "adaptive":
      return {
        what: t(
          "Mô phỏng cách một hệ thống dựa trên rủi ro chọn thử thách tiếp theo: giống người thì không thêm gì, chưa chắc thì gợi ý Ô đánh dấu, giống mô phỏng thì gợi ý Thanh trượt.",
          "A simulation of how a risk-based system picks the next challenge: human-like adds nothing, uncertain suggests a Checkbox, synthetic-like suggests a Slider.",
        ),
        how: t(
          "Bạn chọn một ví dụ mô phỏng do CaptchaLab sinh ra. Nó đi qua đúng bộ phân loại thử nghiệm của Phòng thí nghiệm hành vi, rồi nhãn được ánh xạ sang một gợi ý. Phòng này không thêm luật hay ngưỡng nào.",
          "You pick a synthetic example CaptchaLab generated. It goes through the Behavioral Lab's own experimental classifier, and the label is mapped to a suggestion. This lab adds no rule or threshold.",
        ),
        measures: t(
          "Không đo gì từ bạn. Nó chỉ cho thấy nhãn của bộ phân loại và gợi ý tương ứng.",
          "It measures nothing from you. It only shows the classifier's label and the matching suggestion.",
        ),
        notProve: t(
          "Gợi ý chỉ là chữ và một đường dẫn tuỳ chọn. Không có trang nào bị chặn, chuyển hướng hay hạn chế, và đây không phải công cụ đánh giá rủi ro dùng thật.",
          "A suggestion is text and an optional link. Nothing is blocked, redirected or restricted, and this is not a production risk engine.",
        ),
        limits: t(
          "Chỉ phản ánh bộ phân loại hiện có (luật tay) và chỉ có ba gợi ý cố định.",
          "It reflects only the existing hand-written classifier, and there are just three fixed suggestions.",
        ),
        ...common,
      };
  }
}
