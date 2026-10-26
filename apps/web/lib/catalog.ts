import { EN, type Translate } from "@/lib/i18n";

/**
 * The six CaptchaLab challenges as data for the /playground and /learn index pages. Short, factual and
 * consistent with each playground's own Learn section. Nothing here claims to describe a commercial system.
 * `catalogFor(t)` builds it in the current language; `CATALOG` is the English version.
 */

export interface CatalogEntry {
  id: "slider" | "checkbox" | "drag-drop" | "rotation" | "text" | "image-grid" | "shape-matching" | "math-logic" | "sequence" | "memory" | "proof-of-work" | "audio";
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
    {
      id: "shape-matching",
      name: t("Ghép hình", "Shape Matching"),
      route: "/playground/shape-matching",
      summary: t("Ghép mỗi hình với đích giống nó.", "Match each shape to its counterpart."),
      variantsNote: t(
        "Hai biến thể: Hình y hệt (mỗi hình có bản sao giống hệt) và Ghép theo cấu trúc (đích bị xoay, chỉ có viền hoặc đổi cỡ). Độ khó tăng số cặp (3, 4, 5) và độ giống của các hình nhiễu (ở mức khó có cả cặp tròn/bầu dục và vuông/vuông bo góc).",
        "Two variants: Exact shape (each shape has an identical twin) and Pattern match (targets are turned, outlined or resized). Difficulty raises the number of pairs (3, 4, 5) and how alike the distractors are (the hard level has both the circle/oval and square/rounded-square pairs).",
      ),
      learn: {
        howItWorks: t(
          "Bạn chọn một hình nguồn, rồi chọn đích tương ứng để tạo một cặp. Bạn có thể đổi cặp, bỏ chọn hoặc gỡ một cặp sai. Dùng được bằng chuột, cảm ứng và bàn phím.",
          "You select a source shape, then its matching target to make a pair. You can replace a pair, clear a selection or remove a wrong pair. It works with a mouse, touch and the keyboard.",
        ),
        generation: t(
          "Bộ sinh theo seed chọn các hình khác nhau cho từng cặp, rồi xáo thứ tự các đích. Ở biến thể Ghép theo cấu trúc, đích còn bị xoay, đổi cỡ hoặc chỉ vẽ viền. Mỗi hình chỉ xuất hiện một lần ở mỗi bên nên chỉ có đúng một cách ghép.",
          "A seeded generator picks a different shape for each pair and shuffles the targets. In Pattern match the targets are also turned, resized or drawn as outlines. Every shape appears once on each side, so there is exactly one correct matching.",
        ),
        verification: t(
          "Chỉ xét đúng sai: mọi hình nguồn phải được ghép với đích của nó. Cách bạn thao tác không ảnh hưởng đến kết quả.",
          "Correctness only: every source must be matched to its own target. How you interacted never affects the result.",
        ),
        signals: [
          t("Thời gian phản ứng, thời gian đến lần ghép đầu tiên và tổng thời gian.", "Reaction time, time to the first match and total time."),
          t("Số lần chọn, số lần ghép đúng và sai.", "Selections, correct and incorrect match attempts."),
          t("Số lần sửa (đổi hoặc gỡ một cặp) và thời gian trung bình giữa các thao tác.", "Corrections (replacing or removing a pair) and the mean time between actions."),
        ],
        strengths: [
          t("Cần so sánh hình ảnh nhưng không cần kéo thả chính xác.", "Needs visual comparison but no precise dragging."),
          t("Dùng được bằng bàn phím.", "Works with the keyboard."),
        ],
        weaknesses: [
          t("Ghép hình đơn giản có thể giải bằng hình học hoặc thị giác máy tính.", "Simple shape matching can be solved with geometry or computer vision."),
          t("Các hình na ná nhau gây khó cho cả người dùng.", "Look-alike shapes are hard for people too."),
        ],
        accessibility: t(
          "Mỗi hình là một nút có nhãn nêu tên hình, chọn bằng Tab rồi Enter hoặc Space. Nhãn nêu tên hình nên không cần nhìn, và điều đó cũng khiến bản demo rất dễ với phần mềm.",
          "Each shape is a button whose label names the shape: Tab to it, then Enter or Space. Labels name the shapes, so sight is not needed, which also makes the demo trivial for software.",
        ),
        automation: `${t(
          "Ghép hình đơn giản có thể được tự động hoá bằng thị giác máy tính hoặc hình học. CaptchaLab không cung cấp bộ giải nào.",
          "Simple shape matching can be automated with computer vision or geometry. CaptchaLab ships no solver.",
        )} ${automationNote}`,
      },
    },
    {
      id: "math-logic",
      name: t("Toán / Logic", "Math / Logic"),
      route: "/playground/math-logic",
      summary: t("Tính hoặc so sánh rồi gõ đáp án.", "Work it out or compare, then type the answer."),
      variantsNote: t(
        "Hai biến thể: Tính toán (dễ: cộng/trừ, vừa: có nhân với số lớn hơn, khó: hai bước như (7 + 5) × 2) và So sánh (dễ: hai số cách xa, vừa: gần nhau, khó: hai biểu thức). Biểu thức được sinh thành cây dữ liệu rồi mới hiển thị; không dùng eval.",
        "Two variants: Arithmetic (easy: add/subtract, medium: adds multiplication with larger operands, hard: two steps such as (7 + 5) × 2) and Comparison (easy: far-apart numbers, medium: close ones, hard: two expressions). Expressions are generated as a data tree and then shown; there is no eval.",
      ),
      learn: {
        howItWorks: t(
          "Bạn thấy một phép tính hoặc hai giá trị và gõ đáp án (với phép so sánh, gõ giá trị lớn hơn), rồi bấm Xác minh hoặc nhấn Enter.",
          "You see a calculation or two values and type the answer (for a comparison, the larger value), then press Verify or Enter.",
        ),
        generation: t(
          "Bộ sinh theo seed dựng một cây biểu thức nhỏ và tính đáp án từ chính cây đó. Không bao giờ phân tích chuỗi do người dùng nhập thành biểu thức, và không dùng eval.",
          "A seeded generator builds a small expression tree and computes the answer from that same tree. A string typed by the user is never parsed as an expression, and there is no eval.",
        ),
        verification: t(
          "Chỉ xét đúng sai: chuỗi gõ vào được đọc rất chặt (chỉ dấu trừ tuỳ chọn và chữ số) và so với đáp án tính lại từ thử thách. \"12abc\" là sai.",
          "Correctness only: the typed text is read strictly (an optional minus sign and digits) and compared with the answer recomputed from the challenge. \"12abc\" fails.",
        ),
        signals: [
          t("Thời gian đến phím đầu tiên và tổng thời gian.", "Time to the first key and total time."),
          t("Nhịp gõ, số lần xoá và sửa, số đợt gõ.", "Typing rhythm, deletes and corrections, typing bursts."),
          t("Bản ghi chỉ lưu loại phím (Chữ số, Chữ cái...), không bao giờ lưu chữ số cụ thể.", "The recording stores key classes (Digit, Letter...), never which digit."),
        ],
        strengths: [
          t("Dễ tiếp cận hơn nhiều thử thách thị giác.", "Much easier to make accessible than visual challenges."),
          t("Chỉ cần một ô nhập có nhãn.", "Needs only a labelled input."),
        ],
        weaknesses: [
          t("Phép tính đơn giản rất dễ tự động hoá.", "Simple arithmetic is trivial to automate."),
          t("Độ khó cao hơn không có nghĩa là an toàn hơn trong thực tế.", "A higher difficulty does not mean more security in practice."),
        ],
        accessibility: t(
          "Một ô nhập có nhãn dùng được bằng bàn phím và trình đọc màn hình; phép tính được viết bằng chữ cho trình đọc màn hình. Người gặp khó khăn với tính nhẩm có thể thấy khó.",
          "A labelled input usable with a keyboard and a screen reader; the calculation is also exposed as text. People who find mental arithmetic hard may struggle.",
        ),
        automation: `${t(
          "Số học đơn giản có thể được tự động hoá chỉ bằng vài dòng mã. CaptchaLab không cung cấp bộ giải nào.",
          "Simple arithmetic can be automated in a few lines of code. CaptchaLab ships no solver.",
        )} ${automationNote}`,
      },
    },
    {
      id: "sequence",
      name: t("Dãy quy luật", "Sequence"),
      route: "/playground/sequence",
      summary: t("Tìm số hoặc hình còn thiếu trong một dãy.", "Find the missing number or shape in a sequence."),
      variantsNote: t(
        "Hai biến thể: Dãy số (dễ: cộng một bước đều, vừa: nhân hoặc hai bước xen kẽ, khó: hai quy tắc xen kẽ) và Dãy hình (đơn vị lặp dài 2, 3, 4 hình). Mỗi thử thách chỉ có một đáp án theo các họ quy luật tương ứng.",
        "Two variants: Number (easy: a steady step, medium: multiplying or alternating steps, hard: two interleaved rules) and Visual (a repeating unit of 2, 3, 4 shapes). Each challenge has exactly one answer under the pattern families of its level.",
      ),
      learn: {
        howItWorks: t(
          "Dãy số: gõ số còn thiếu. Dãy hình: chọn hình còn thiếu trong các lựa chọn. Cả hai đều có thể dùng bằng bàn phím.",
          "Number: type the missing number. Visual: pick the missing shape from the options. Both work with the keyboard.",
        ),
        generation: t(
          "Bộ sinh theo seed dựng dãy từ một quy luật, ẩn một phần tử, rồi kiểm tra rằng không có quy luật đơn giản hơn nào cho đáp án khác. Nếu mơ hồ, nó bốc lại.",
          "A seeded generator builds the sequence from one rule, hides one term, then checks that no simpler rule would give a different answer. If it is ambiguous, it draws again.",
        ),
        verification: t(
          "Chỉ xét đúng sai: số hoặc hình lựa chọn phải đúng bằng phần tử bị ẩn. Cách bạn thao tác không ảnh hưởng đến kết quả.",
          "Correctness only: the number or option must equal the hidden term. How you interacted never affects the result.",
        ),
        signals: [
          t("Dãy số: nhịp gõ, số lần xoá và sửa, số đợt gõ.", "Number: typing rhythm, deletes and corrections, typing bursts."),
          t("Dãy hình: thời gian đến lần chọn đầu tiên, số lần chọn và đổi ý.", "Visual: time to the first choice, selections and changes of mind."),
          t("Chỉ số không áp dụng cho biến thể đang dùng được để trống.", "Measures that do not apply to the variant in use are left empty."),
        ],
        strengths: [
          t("Đòi hỏi suy luận quy luật chứ không chỉ nhìn.", "Calls for reasoning about a pattern, not just looking."),
          t("Dùng được bằng bàn phím.", "Works with the keyboard."),
        ],
        weaknesses: [
          t("Quy luật đơn giản có thể tự động hoá.", "Simple patterns can be automated."),
          t("Quy luật mơ hồ làm người dùng bực mình; vì vậy bộ sinh loại bỏ chúng.", "Ambiguous patterns frustrate people; the generator therefore rejects them."),
        ],
        accessibility: t(
          "Dãy số dùng một ô nhập có nhãn; dãy hình dùng các nút có nhãn nêu tên hình. Cả hai dùng được bằng bàn phím, nhưng dãy hình cần nhận biết quy luật.",
          "Numbers use a labelled input; shapes use buttons whose labels name the shape. Both work with the keyboard, but the visual variant needs pattern recognition.",
        ),
        automation: `${t(
          "Logic dãy đơn giản có thể được tự động hoá. CaptchaLab không cung cấp bộ giải nào cho người dùng.",
          "Simple sequence logic can be automated. CaptchaLab exposes no solver to users.",
        )} ${automationNote}`,
      },
    },
    {
      id: "memory",
      name: t("Trí nhớ", "Memory"),
      route: "/playground/memory",
      summary: t("Xem, rồi nhớ lại đúng thứ tự hoặc vị trí.", "Watch, then recall the order or the positions."),
      variantsNote: t(
        "Hai biến thể: Nhớ chuỗi (xem 3, 4, 5 hình rồi bấm lại đúng thứ tự) và Nhớ vị trí (2, 4 hoặc 6 ô sáng lên trên lưới 3×3 hoặc 4×4). Độ khó tăng số cần nhớ và rút ngắn thời gian xem trên mỗi mục; nút bấm luôn giữ nguyên cỡ.",
        "Two variants: Sequence memory (watch 3, 4 or 5 shapes, then tap them in order) and Position memory (2, 4 or 6 cells light up on a 3×3 or 4×4 grid). Difficulty raises how much to remember and shortens the preview per item; the buttons never get smaller.",
      ),
      learn: {
        howItWorks: t(
          "Bạn bấm Bắt đầu, xem phần cần nhớ trong vài giây, rồi nó bị ẩn đi và bạn nhập lại: bấm các hình theo thứ tự, hoặc bấm các ô đã sáng. Có thể hoàn tác, xoá hoặc bỏ chọn.",
          "You press Start and watch what is shown for a few seconds. Then it is hidden and you recall it: tap the shapes in order, or the cells that lit up. You can undo, clear or deselect.",
        ),
        generation: t(
          "Bộ sinh theo seed chọn các hình khác nhau (và các hình gây nhiễu) hoặc các ô sáng. Cùng seed, biến thể và độ khó thì ra cùng một nội dung và cùng thời gian xem.",
          "A seeded generator picks different shapes (plus distractors) or the lit cells. The same seed, variant and difficulty give the same content and the same preview time.",
        ),
        verification: t(
          "Chỉ xét đúng sai: chuỗi phải đúng từng vị trí, hoặc tập ô phải đúng hoàn toàn. Cách bạn thao tác không ảnh hưởng đến kết quả.",
          "Correctness only: the sequence must be right in every position, or the set of cells must be exactly right. How you interacted never affects the result.",
        ),
        signals: [
          t("Thời gian từ lúc bắt đầu nhớ đến lần chọn đầu tiên và thời gian nhớ lại.", "Time from the start of recall to the first selection, and the recall duration."),
          t("Số lần chọn đúng và sai, số lần hoàn tác hoặc bỏ chọn.", "Right and wrong selections, undos and deselections."),
          t("Nội dung cần nhớ, cỡ lưới và thời gian xem là cấu hình thử thách, không phải chỉ số hành vi.", "What was to be remembered, the grid size and the preview time are challenge configuration, not behavioral measures."),
        ],
        strengths: [
          t("Không cần di chuyển chính xác; dùng được bằng bàn phím.", "No precise movement needed; works with the keyboard."),
          t("Đo được một khía cạnh khác với nhìn và kéo.", "Measures something different from looking and dragging."),
        ],
        weaknesses: [
          t("Nhiệm vụ nhớ khó với một số người (trí nhớ ngắn hạn, mệt, xao nhãng).", "A memory task is hard for some people (short-term memory, fatigue, distraction)."),
          t("Phần mềm nhớ hoàn hảo, nên nhiệm vụ nhớ đơn giản rất dễ tự động hoá.", "Software remembers perfectly, so a simple memory task is easy to automate."),
        ],
        accessibility: t(
          "Có lo ngại về khả năng tiếp cận nhận thức; CaptchaLab không tuyên bố dùng được cho mọi người. Các nút có nhãn, dùng bằng Tab rồi Enter hoặc Space. Phần xem cũng được đọc cho trình đọc màn hình thì sẽ làm mất ý nghĩa của bài, nên bản demo không làm vậy.",
          "There are cognitive-accessibility concerns; CaptchaLab does not claim it is usable by everyone. Buttons are labelled and work with Tab then Enter or Space. Reading the preview aloud to a screen reader would defeat the task, so the demo does not.",
        ),
        automation: `${t(
          "Một nhiệm vụ nhớ đơn giản, xác định trước có thể được tự động hoá vì chương trình biết sẵn nội dung. CaptchaLab không cung cấp bộ giải nào.",
          "A simple, deterministic memory task can be automated because a program is handed the content. CaptchaLab ships no solver.",
        )} ${automationNote}`,
      },
    },
    {
      id: "proof-of-work",
      name: t("Bằng chứng công việc", "Proof of Work"),
      route: "/playground/proof-of-work",
      summary: t("Máy tính của bạn tự tính để tạo bằng chứng.", "Your device computes a proof."),
      variantsNote: t(
        "Hai biến thể: Tiền tố mã băm (SHA-256 bắt đầu bằng 00, 000 hoặc 0000) và Số bit 0 đứng đầu (9, 13, 15 bit). Độ khó luôn rất thấp để chạy nhanh trên máy bình thường; công việc chạy từng đoạn nhỏ và có thể Huỷ.",
        "Two variants: Hash prefix (SHA-256 starting with 00, 000 or 0000) and Leading zero bits (9, 13, 15 bits). Difficulty stays very low so it finishes quickly on a normal device; the work runs in small chunks and can be cancelled.",
      ),
      learn: {
        howItWorks: t(
          "Bạn bấm Bắt đầu. Trình duyệt thử lần lượt các số (nonce) 0, 1, 2... cho đến khi SHA-256 của \"chuỗi:nonce\" đạt điều kiện. Rồi bằng chứng được kiểm tra. Bạn có thể Huỷ giữa chừng.",
          "You press Start. The browser tries nonces 0, 1, 2... until the SHA-256 of \"text:nonce\" meets the condition. Then the proof is checked. You can Cancel at any time.",
        ),
        generation: t(
          "Bộ sinh theo seed chỉ tạo ra một chuỗi ngẫu nhiên cố định. Nó không tính gì cả: phần việc là do thiết bị của bạn làm. Vì tìm từ nonce 0, cùng thử thách luôn cho cùng nonce đầu tiên hợp lệ.",
          "A seeded generator only makes a fixed random text. It computes nothing: the work is what your device does. Because the search starts at nonce 0, the same challenge always gives the same first valid nonce.",
        ),
        verification: t(
          "Trình xác minh tự tính lại mã băm từ thử thách và nonce được nêu, không tin kết quả của giao diện. Nonce sai hình thức thì bị loại.",
          "The verifier recomputes the hash itself from the challenge and the claimed nonce and does not trust what the page found. A malformed nonce fails.",
        ),
        signals: [
          t("Đây là số đo của phép tính, không phải tín hiệu \"giống người\": thời gian tính, số lần băm, tốc độ băm, nonce tìm được.", "These measure the computation, not human-like signals: computation time, hashes, hashes per second, the nonce found."),
          t("Số lần bấm Bắt đầu và Huỷ.", "How many times Start and Cancel were pressed."),
          t("Chỉ ghi vài sự kiện bấm nút, không bao giờ ghi từng lần băm.", "Only a few button presses are recorded, never one event per hash."),
        ],
        strengths: [
          t("Không cần người dùng suy nghĩ hay thao tác gì thêm.", "Needs no thinking or extra action from the user."),
          t("Làm tốn chi phí tính toán cho mỗi yêu cầu.", "Puts a computational cost on every request."),
        ],
        weaknesses: [
          t("Không chứng minh người dùng là con người: chỉ chứng minh thiết bị đã bỏ công việc tính toán.", "It does not prove the user is a person: it proves a device did the computational work."),
          t("Máy mạnh hay phần cứng chuyên dụng làm việc này rất nhanh, còn thiết bị yếu thì chậm và tốn pin.", "Powerful machines and special hardware do the work very fast, while weak devices are slow and drain the battery."),
        ],
        accessibility: t(
          "Không cần nhìn, nghe hay thao tác chính xác, nên ít rào cản về giác quan. Người dùng thiết bị cũ có thể phải chờ lâu hơn; luôn có nút Huỷ.",
          "No sight, hearing or precise movement is needed, so there are few sensory barriers. People on older devices may wait longer; Cancel is always there.",
        ),
        automation: `${t(
          "Bằng chứng công việc không ngăn tự động hoá: một chương trình tự tính nó. Mục đích của nó là làm cho việc gửi hàng loạt trở nên tốn kém.",
          "Proof of work does not stop automation: a program simply computes it. Its aim is to make bulk requests costly.",
        )} ${automationNote}`,
      },
    },
    {
      id: "audio",
      name: t("Âm thanh", "Audio"),
      route: "/playground/audio",
      summary: t("Nghe các chữ số rồi gõ lại.", "Listen to the digits and type them."),
      variantsNote: t(
        "Hai biến thể: Đọc chữ số và Chữ số có nhiễu. Độ khó thêm chữ số (4, 5, 6), rút ngắn khoảng nghỉ (không dưới 240 ms) và thêm tiếng ồn nhỏ; tiếng ồn luôn nhỏ hơn nhiều so với giọng đọc.",
        "Two variants: Spoken digits and Digits with noise. Difficulty adds digits (4, 5, 6), shortens the gaps (never below 240 ms) and adds quiet noise; the noise always stays well below the speech.",
      ),
      learn: {
        howItWorks: t(
          "Bạn bấm Phát để nghe các chữ số (tiếng Anh), có thể bấm Phát lại, rồi gõ các chữ số nghe được và bấm Xác minh.",
          "You press Play to hear the digits (in English), can press Replay, then type what you heard and press Verify.",
        ),
        generation: t(
          "Bộ sinh theo seed chọn các chữ số, khoảng nghỉ và mức nhiễu. Âm thanh ghép từ các đoạn thu sẵn trong repo (một đoạn cho mỗi chữ số) và nhiễu tạo ngay trong trình duyệt từ một seed, nên cùng thử thách luôn nghe giống nhau. Không dùng dịch vụ đọc bên ngoài.",
          "A seeded generator picks the digits, the gaps and the noise level. The sound is made from clips stored in the repository (one per digit) plus noise generated in the browser from a seed, so the same challenge always sounds the same. No external speech service is used.",
        ),
        verification: t(
          "Chỉ xét đúng sai: các chữ số gõ vào phải đúng bằng các chữ số đã phát, không thừa không thiếu. Cách bạn gõ không ảnh hưởng đến kết quả.",
          "Correctness only: the typed digits must equal the played digits exactly. How you typed never affects the result.",
        ),
        signals: [
          t("Thời gian đến lần phát đầu tiên, số lần phát hoặc phát lại.", "Time to the first play, and how many times it was played or replayed."),
          t("Nhịp gõ, số lần xoá và sửa; bản ghi chỉ lưu loại phím, không bao giờ lưu chữ số cụ thể.", "Typing rhythm, deletes and corrections; the recording stores key classes, never which digit."),
          t("Thời gian từ lần phát cuối đến lúc gửi.", "Time from the last play to submitting."),
        ],
        strengths: [
          t("Hữu ích với một số người không dùng được thử thách hình ảnh.", "Useful for some people who cannot use visual challenges."),
          t("Chỉ cần một ô nhập có nhãn.", "Needs only a labelled input."),
        ],
        weaknesses: [
          t("Không dùng được với người khiếm thính; nghe lẫn trong môi trường ồn cũng khó.", "Not usable by deaf or hard-of-hearing people; hearing in a noisy place is hard too."),
          t("Nhận dạng giọng nói hiện đại có thể giải các thử thách âm thanh đơn giản.", "Modern speech recognition can solve simple audio challenges."),
        ],
        accessibility: t(
          "Âm thanh không bao giờ nên là cách duy nhất: trang này có đường dẫn sang một thử thách không dùng âm thanh. Trang không hiện lời của thử thách bằng chữ vì như vậy sẽ phá mục đích của bản demo. Hệ thống thật cần các cách thay thế khác.",
          "Audio should never be the only way: this page links to a challenge that needs no audio. The page does not show the challenge as text, since that would defeat the demo. Real systems need alternative modalities.",
        ),
        automation: `${t(
          "Nhận dạng giọng nói có thể giải thử thách âm thanh đơn giản. CaptchaLab không cài bộ giải nào và không dùng micro.",
          "Speech recognition can solve simple audio challenges. CaptchaLab implements no solver and never uses the microphone.",
        )} ${automationNote}`,
      },
    },
  ];
}

export const CATALOG: readonly CatalogEntry[] = catalogFor(EN);
