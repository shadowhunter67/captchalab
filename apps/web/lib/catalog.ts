import { EN, type Translate } from "@/lib/i18n";

/**
 * The six CaptchaLab challenges as data for the /playground and /learn index pages. Short, factual and
 * consistent with each playground's own Learn section. Nothing here claims to describe a commercial system.
 * `catalogFor(t)` builds it in the current language; `CATALOG` is the English version.
 */

export interface CatalogEntry {
  id: "slider" | "checkbox" | "drag-drop" | "rotation" | "text" | "image-grid";
  name: string;
  route: string;
  summary: string;
  /** Short text for "Variants & difficulty" on the Learn page. */
  variantsNote: string;
  learn: {
    howItWorks: string;
    generation: string;
    verification: string;
    signals: readonly string[];
    strengths: readonly string[];
    weaknesses: readonly string[];
    accessibility: string;
    automation: string;
  };
}

export function catalogFor(t: Translate = EN): readonly CatalogEntry[] {
  const automationNote = t(
    "CaptchaLab chỉ nghiên cứu thử thách của chính nó và không tích hợp hay tự động hoá bất kỳ dịch vụ bên thứ ba nào.",
    "CaptchaLab studies only its own lab challenge and does not integrate with or automate any third-party service.",
  );
  return [
    {
      id: "slider",
      name: t("Thanh trượt", "Slider"),
      route: "/playground/slider",
      summary: t("Kéo một tay nắm đến vị trí đích.", "Drag a handle to a target position."),
      variantsNote: t(
        "Hai biến thể: Cổ điển (độ khó thu hẹp vùng thả được chấp nhận: ±4%, ±2%, ±1,2% quãng trượt) và Chính xác (vùng đích hẹp ngay từ đầu: ±1,5%, ±1,2%, ±1%). Phím mũi tên đi 1% mỗi lần nên dung sai không xuống dưới 1%.",
        "Two variants: Classic (difficulty narrows the accepted release window: ±4%, ±2%, ±1.2% of the travel) and Precision (a narrow target from the start: ±1.5%, ±1.2%, ±1%). Arrow keys move 1% per press, so the tolerance never goes below 1%.",
      ),
      learn: {
        howItWorks: t(
          "Bạn kéo tay nắm dọc theo thanh cho đến khi nó nằm trên khung nét đứt, rồi thả ra.",
          "You drag a handle along a track until it lands on a dashed outline, then release.",
        ),
        generation: t(
          "Bộ sinh ngẫu nhiên theo seed chọn vị trí đích trong khoảng 25% đến 90% quãng đường của tay nắm.",
          "A seeded generator picks a target position between 25% and 90% of the handle's travel.",
        ),
        verification: t(
          "Chỉ xét đúng sai: vị trí thả phải cách đích không quá 2% quãng đường. Cách bạn kéo không bao giờ ảnh hưởng đến kết quả đạt hay chưa đạt.",
          "Correctness only: the release position must be within 2% of travel of the target. The way you dragged never affects pass or fail.",
        ),
        signals: [
          t("Thời gian kéo, sai lệch khi thả và độ vượt quá đích.", "Drag duration, release error and overshoot past the target."),
          t("Tốc độ, gia tốc và các lần đổi hướng dọc theo đường đi.", "Speed, acceleration and direction changes along the path."),
          t("Số lần thử và cách tiếp cận trước khi bấm.", "Number of attempts and the approach before the press."),
        ],
        strengths: [
          t("Nhanh và dễ hiểu với chuột hoặc ngón tay.", "Fast and intuitive with a mouse or finger."),
          t("Tạo ra đường đi liên tục, phong phú để nghiên cứu.", "Produces a rich, continuous trajectory to study."),
        ],
        weaknesses: [
          t("Phần mềm dễ dàng tạo ra một đường đi.", "A path is easy for software to generate."),
          t("Khó với người vận động hạn chế nếu không có cách dùng bàn phím.", "Hard for people with motor impairments without a keyboard path."),
        ],
        accessibility: t(
          "Phím mũi tên di chuyển tay nắm và Enter để gửi, nhưng hỗ trợ trình đọc màn hình còn hạn chế: vị trí đích chỉ được thể hiện bằng hình ảnh.",
          "Arrow keys move the handle and Enter submits, but screen-reader support is limited: the target is conveyed visually.",
        ),
        automation: `${t(
          "Một đường thẳng hoặc đã làm mượt rất dễ tạo ra, và trang So sánh cho thấy điều đó.",
          "A straight or smoothed path is trivial to synthesize, which is what the Compare page shows.",
        )} ${automationNote}`,
      },
    },
    {
      id: "checkbox",
      name: t("Ô đánh dấu", "Checkbox"),
      route: "/playground/checkbox",
      summary: t("Bật một ô đánh dấu có sẵn của trình duyệt.", "Activate a native checkbox."),
      variantsNote: t(
        "Một biến thể Cơ bản với một mức duy nhất. Làm ô đánh dấu \"khó hơn\" bằng độ trễ hay thao tác xác nhận chỉ gây phiền cho người dùng, nên độ khó không áp dụng ở đây.",
        "One Basic variant with a single level. Making a checkbox \"harder\" with a delay or a confirmation step would only annoy people, so difficulty does not apply here.",
      ),
      learn: {
        howItWorks: t(
          "Bạn bật ô đánh dấu bằng con trỏ hoặc phím Space. Đánh dấu xong là gửi thử thách.",
          "You activate a checkbox with a pointer or the Space key. Checking it submits the challenge.",
        ),
        generation: t(
          "Không có gì cần tạo ngoài trạng thái mong đợi (đã đánh dấu).",
          "There is nothing to generate beyond the expected state (checked).",
        ),
        verification: t(
          "Chỉ xét đúng sai: ô phải được đánh dấu. Hành vi không bao giờ quyết định kết quả.",
          "Correctness only: the answer must be checked. Behavior never decides the verdict.",
        ),
        signals: [
          t("Thời gian phản ứng và thời gian đến lần bấm đầu tiên.", "Reaction time and time to the first press."),
          t("Thời gian giữ nút bấm và vị trí con trỏ.", "Press duration and pointer position."),
          t("Cách nhập và chuyển động tiếp cận.", "Input modality and approach motion."),
        ],
        strengths: [
          t("Gần như không tốn công sức với con người.", "Almost no effort for people."),
          t("Tiếp cận được ngay từ bản chất.", "Natively accessible."),
        ],
        weaknesses: [
          t(
            "Bản thân thử thách không chứng minh được gì; giá trị nếu có đến từ các tín hiệu tương tác xung quanh nó.",
            "The challenge itself proves nothing; any value comes from the interaction signals around it.",
          ),
        ],
        accessibility: t(
          "Một ô đánh dấu có sẵn kèm nhãn: dùng được bằng bàn phím và được công nghệ hỗ trợ đọc lên.",
          "A native checkbox with a label: keyboard operable and announced by assistive technology.",
        ),
        automation: `${t("Rất dễ bấm bằng chương trình.", "Trivial to click programmatically.")} ${automationNote}`,
      },
    },
    {
      id: "drag-drop",
      name: t("Kéo thả", "Drag & Drop"),
      route: "/playground/drag-drop",
      summary: t("Đặt nhiều vật vào đúng ô đích tương ứng.", "Place several items on matching targets."),
      variantsNote: t(
        "Biến thể Ghép hình: độ khó làm các hình và vùng thả nhỏ lại (cỡ hình 19% → 17% → 15%, bán kính vùng thả 18% → 14% → 10%).",
        "Shape match: difficulty shrinks the shapes and the drop areas (shape size 19% → 17% → 15%, drop-area radius 18% → 14% → 10%).",
      ),
      learn: {
        howItWorks: t(
          "Bạn kéo từng vật vào ô đích tương ứng. Thả vào ô đã có vật khác sẽ đưa vật cũ về chỗ ban đầu.",
          "You drag each item onto its matching target. Dropping on an occupied target sends the occupant back to its start.",
        ),
        generation: t(
          "Bộ sinh ngẫu nhiên theo seed chọn các vật và xáo trộn ô đích, nên cùng seed cho cùng bố cục.",
          "A seeded generator picks items and shuffled targets so the same seed gives the same layout.",
        ),
        verification: t(
          "Chỉ xét đúng sai: mọi vật phải nằm đúng ô đích của nó. Kiểu kéo không ảnh hưởng đến kết quả.",
          "Correctness only: every item must be on its own target. Dragging style never affects the verdict.",
        ),
        signals: [
          t("Thời gian từng lần kéo, sai lệch khi thả và độ vượt quá đích.", "Per-drag duration, release error and overshoot."),
          t("Số lần thử và số lần kéo lại.", "Number of attempts and re-drags."),
          t("Tốc độ, gia tốc và các lần đổi hướng.", "Speed, acceleration and direction changes."),
        ],
        strengths: [
          t("Nhiều lần kéo cho bức tranh đầy đủ hơn một lần.", "Many drags give a richer picture than one."),
          t("Dễ hiểu.", "Intuitive."),
        ],
        weaknesses: [
          t("Cần điều khiển con trỏ chính xác.", "Needs fine pointer control."),
          t("Bản demo này không có cách dùng bàn phím thay thế.", "No keyboard alternative in this demo."),
        ],
        accessibility: t(
          "Người chỉ dùng bàn phím không dùng được bản demo này; hạn chế này được ghi rõ trên trang.",
          "Not usable by keyboard-only users in this demo; this limitation is documented on the page.",
        ),
        automation: `${t(
          "Có thể tạo các lần kéo từ hình học của ô đích.",
          "Drags can be synthesized from the target geometry.",
        )} ${automationNote}`,
      },
    },
    {
      id: "rotation",
      name: t("Xoay ảnh", "Image Rotation"),
      route: "/playground/rotation",
      summary: t("Xoay một vật cho thẳng đứng.", "Turn an object upright."),
      variantsNote: t(
        "Cổ điển: độ khó thu hẹp góc được chấp nhận (±20°, ±12°, ±6°). Lệch góc ban đầu: dung sai ±12° giữ nguyên, nhưng vật bắt đầu xa vị trí thẳng đứng hơn (40–90°, 90–140°, 140–180° về một bên ngẫu nhiên).",
        "Classic: difficulty narrows the accepted angle (±20°, ±12°, ±6°). Offset start: the ±12° tolerance stays, but the object starts further from upright (40–90°, 90–140°, 140–180° to a random side).",
      ),
      learn: {
        howItWorks: t(
          "Bạn xoay vật bằng cách kéo quanh tâm của nó hoặc dùng phím mũi tên cho đến khi thẳng đứng, rồi bấm Xác minh.",
          "You turn an object by dragging around its centre or with the arrow keys until it is upright, then verify.",
        ),
        generation: t(
          "Bộ sinh ngẫu nhiên theo seed chọn một góc xuất phát lệch khỏi tư thế thẳng đứng.",
          "A seeded generator picks a starting angle away from upright.",
        ),
        verification: t(
          "Chỉ xét đúng sai: góc cuối cùng phải nằm trong ngưỡng sai số so với tư thế thẳng đứng.",
          "Correctness only: the final angle must be within a tolerance of upright.",
        ),
        signals: [
          t("Quãng góc đã xoay và vận tốc góc.", "Angular distance and angular velocity."),
          t("Số lần kéo và số lần kéo bị huỷ.", "Drag count and cancelled drags."),
          t("Các bước và loạt bấm phím.", "Keyboard steps and bursts."),
        ],
        strengths: [t("Cần phán đoán không gian, không chỉ là một cú bấm.", "Needs a spatial judgment, not just a click.")],
        weaknesses: [
          t("Vật đối xứng gây mơ hồ.", "Symmetric objects are ambiguous."),
          t("Phần mềm có thể tính ra góc cần xoay.", "Software can compute the needed angle."),
        ],
        accessibility: t(
          "Phím mũi tên xoay từng bước 5 độ và điều khiển được cung cấp dưới dạng thanh trượt kèm giá trị.",
          "Arrow keys turn in 5-degree steps and the control is exposed as a slider with its value.",
        ),
        automation: `${t(
          "Trang biết sẵn góc đích, nên phần mềm có thể tính ra cách xoay.",
          "The target angle is known to the page, so software can compute the turn.",
        )} ${automationNote}`,
      },
    },
    {
      id: "text",
      name: t("Văn bản", "Text"),
      route: "/playground/text",
      summary: t("Đọc các ký tự bị biến dạng và gõ lại.", "Read distorted characters and type them."),
      variantsNote: t(
        "Ba biến thể: Sạch (ít méo), Xoay chữ (mỗi chữ xoay và dịch riêng) và Nhiễu (nhiều đường ngẫu nhiên). Độ khó đổi số ký tự (5 hoặc 6), góc xoay mỗi chữ, độ dịch dọc và số đường nhiễu; mọi tham số được hiện trong phần Cấu hình thử thách.",
        "Three variants: Clean (little distortion), Rotated (each character turned and shifted) and Noisy (many random lines). Difficulty changes the character count (5 or 6), the rotation of each character, the vertical shift and the number of noise lines; every parameter is shown in Challenge configuration.",
      ),
      learn: {
        howItWorks: t("Bạn đọc một chuỗi ngắn bị biến dạng và gõ lại.", "You read a short distorted string and type it."),
        generation: t(
          "Bộ sinh ngẫu nhiên theo seed chọn sáu ký tự không dễ nhầm lẫn, xoay và dịch từng ký tự rồi thêm các đường nhiễu.",
          "A seeded generator picks six characters without look-alikes, rotates and shifts each and adds noise lines.",
        ),
        verification: t(
          "Chỉ xét đúng sai: văn bản gõ vào, sau khi cắt khoảng trắng thừa và không phân biệt hoa thường, phải bằng chuỗi gốc.",
          "Correctness only: the typed text, trimmed and compared case-insensitively, must equal the string.",
        ),
        signals: [
          t("Thời gian đến ký tự đầu tiên và tổng thời gian.", "Time to first character and total time."),
          t("Nhịp gõ giữa các ký tự và các lần sửa.", "Rhythm between characters and corrections."),
          t("Bản ghi chỉ lưu loại phím, không bao giờ lưu chữ cái nào.", "The recording stores key classes, never which letter."),
        ],
        strengths: [t("Quen thuộc và rẻ.", "Familiar and cheap.")],
        weaknesses: [
          t("Phần mềm nhận dạng chữ (OCR) hiện đại đọc tốt văn bản biến dạng đơn giản.", "Modern OCR reads simple distorted text well."),
          t("Khó đọc với nhiều người.", "Hard to read for many people."),
        ],
        accessibility: t(
          "Ô nhập có nhãn và dùng được bằng bàn phím, nhưng nhiệm vụ cần nhìn và bản demo này không có cách thay thế bằng văn bản hay âm thanh.",
          "The field is labelled and keyboard operable, but the task needs sight and this demo has no text or audio alternative.",
        ),
        automation: `${t(
          "Trong bản demo này các ký tự là văn bản SVG thuần, phần mềm đọc rất dễ.",
          "The characters are plain SVG text in this demo, trivial for software to read.",
        )} ${automationNote}`,
      },
    },
    {
      id: "image-grid",
      name: t("Lưới ảnh", "Image Grid"),
      route: "/playground/image-grid",
      summary: t("Chọn mọi ô có hình được nêu tên.", "Select every tile that shows a named shape."),
      variantsNote: t(
        "Hình cơ bản (bốn hình khác nhau rõ) và Hình giống nhau (tròn và bầu dục, vuông và vuông bo góc làm nhiễu). Độ khó tăng số ô khớp: 2–3, 2–4, 3–5 trong 9 ô. Lưới 4×4 chưa có.",
        "Basic shapes (four clearly different shapes) and Similar shapes (circle and oval, square and rounded square act as distractors). Difficulty raises the number of matching cells: 2–3, 2–4, 3–5 of 9. A 4×4 grid is not available yet.",
      ),
      learn: {
        howItWorks: t(
          "Bạn thấy chín ảnh và chọn tất cả ảnh khớp với một hình được nêu tên, rồi bấm Xác minh.",
          "You see nine images and select every one that matches a named shape, then verify.",
        ),
        generation: t(
          "Bộ sinh ngẫu nhiên theo seed đặt hình mục tiêu vào hai đến bốn trong chín ô và lấp phần còn lại bằng các hình khác, vẽ bằng SVG đơn giản.",
          "A seeded generator places the target shape in two to four of nine cells and fills the rest with other shapes, drawn as simple SVG.",
        ),
        verification: t(
          "Chỉ xét đúng sai: các ô được chọn phải đúng bằng các ô khớp, không thiếu và không thừa.",
          "Correctness only: the selected cells must be exactly the matching cells, none missing and none extra.",
        ),
        signals: [
          t("Thời gian phản ứng, thời gian đến lần chọn đầu tiên và tổng thời gian.", "Reaction time, time to first selection and total time."),
          t("Thời gian giữa các lần bấm và số lần bỏ chọn.", "Time between toggles and deselections."),
          t("Số đợt chọn và cách nhập.", "Rounds of selecting and input modality."),
        ],
        strengths: [
          t("Nhanh với con người.", "Quick for people."),
          t("Bộ xác minh chỉ là so sánh hai tập hợp.", "The verifier is a simple set comparison."),
        ],
        weaknesses: [
          t("Phần mềm phân loại ảnh rất giỏi.", "Image classification by software is strong."),
          t("Ảnh mơ hồ làm người dùng bực mình.", "Ambiguous images frustrate people."),
        ],
        accessibility: t(
          "Mỗi ô là một nút bật/tắt có nhãn, điều hướng bằng phím mũi tên; nhãn nêu tên hình.",
          "Each tile is a labelled toggle button with arrow-key navigation; its label names the shape.",
        ),
        automation: `${t(
          "Vì nhãn nêu tên hình, bản demo này rất dễ với phần mềm.",
          "Because labels name the shape, this demo is trivial for software.",
        )} ${automationNote}`,
      },
    },
  ];
}

export const CATALOG: readonly CatalogEntry[] = catalogFor(EN);
