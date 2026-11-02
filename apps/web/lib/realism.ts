import type { Translate } from "@/lib/i18n";
import type { PluginId } from "@/lib/taxonomy";

/**
 * How closely each challenge follows the family of real CAPTCHA it stands for (v1.1). It is read from here by the Learn page
 * and by the coverage matrix, so a claim exists in one place. "yes": the default presentation and interaction are the usual
 * ones for the family; "partial": the family is recognisable but a part is simplified (said in `limits`).
 */
export type RealismLevel = "yes" | "partial";

interface Realism {
  level: RealismLevel;
  /** The real-world family this stands for, in a few words. */
  family: readonly [vi: string, en: string];
  /** What CaptchaLab actually builds. */
  approximation: readonly [vi: string, en: string];
  /** What is deliberately not reproduced. */
  limits: readonly [vi: string, en: string];
}

const NOT_CLONED: readonly [string, string] = [
  "Không sao chép giao diện, chữ, giao thức hay mô hình chấm điểm của bất kỳ nhà cung cấp nào; tranh do CaptchaLab tự vẽ.",
  "No provider's layout, wording, protocol or scoring model is copied; the pictures are CaptchaLab's own drawings.",
];

const R: Readonly<Record<PluginId, Realism>> = {
  slider: {
    level: "yes",
    family: ["Thanh trượt ghép hình", "Slide-the-piece puzzle"],
    approximation: ["Một cảnh có chỗ khuyết và một mảnh ghép chạy theo tay nắm; thả khi mảnh vừa khít.", "A scene with a gap and a piece that follows the handle; release when the piece fits."],
    limits: NOT_CLONED,
  },
  checkbox: {
    level: "partial",
    family: ["Ô đánh dấu chống lạm dụng", "Anti-abuse checkbox"],
    approximation: ["Một thẻ có ô đánh dấu lớn và dấu kiểm tra; kết quả dựa trên đúng trạng thái ô.", "A card with a large checkbox and a check mark; the result is the checkbox state."],
    limits: ["Không có bước kiểm tra ẩn nào: ô đánh dấu tự nó không chứng minh người dùng là con người. " + NOT_CLONED[0], "There is no hidden check behind it: a checkbox does not prove a human user. " + NOT_CLONED[1]],
  },
  "drag-drop": {
    level: "yes",
    family: ["Kéo thả khớp vật thể", "Drag-the-object matching"],
    approximation: ["Ba thẻ vật thể kéo vào bóng của chính nó (hoặc chọn bằng bàn phím).", "Three object cards dragged onto the silhouette of the same object (or chosen by keyboard)."],
    limits: NOT_CLONED,
  },
  rotation: {
    level: "yes",
    family: ["Xoay ảnh cho thẳng", "Turn-the-picture-upright"],
    approximation: ["Một ảnh tròn (cảnh có vật, bầu trời ở trên) cần xoay cho đúng chiều.", "A round picture (a scene with an object, sky above) to turn the right way up."],
    limits: NOT_CLONED,
  },
  text: {
    level: "yes",
    family: ["Văn bản bị méo", "Distorted text"],
    approximation: ["Chữ khác phông, màu, cỡ, độ nghiêng; nền nhiễu, đường cong và gợn sóng nhẹ; luôn đọc được.", "Characters with their own font, colour, size and slant over a speckled background with curves and a mild wave; always readable."],
    limits: ["Không có bộ nhận dạng chữ và không cố làm chữ khó đọc với người. " + NOT_CLONED[0], "There is no OCR and no attempt to make it unreadable to people. " + NOT_CLONED[1]],
  },
  "image-grid": {
    level: "yes",
    family: ["Chọn mọi ảnh có vật được nêu", "Select-all-images grid"],
    approximation: ["Lưới 3×3 ảnh minh hoạ (một vật hoặc cảnh nhỏ); mức khó thêm vật trông giống.", "A 3x3 grid of illustrations (one object, or a small scene); harder levels add look-alikes."],
    limits: ["Là tranh vẽ, không phải ảnh chụp; lưới 4×4 và ảnh động chưa có. " + NOT_CLONED[0], "Drawings, not photographs; no 4x4 grid and no refreshing tiles. " + NOT_CLONED[1]],
  },
  "shape-matching": {
    level: "yes",
    family: ["Ghép hình với bóng", "Match-the-shape"],
    approximation: ["Ảnh vật thể ở một bên, bóng (đổi cỡ) ở bên kia.", "Pictured objects on one side, their resized silhouettes on the other."],
    limits: NOT_CLONED,
  },
  "math-logic": {
    level: "yes",
    family: ["Câu hỏi tính toán đơn giản", "Simple arithmetic question"],
    approximation: ["Một thẻ đề bài rõ ràng, một ô trả lời, một nút xác minh.", "A clear prompt card, one answer field, one verify button."],
    limits: ["Phép tính nằm trong mã nên rất dễ với phần mềm. " + NOT_CLONED[0], "The sum is plain text, so it is trivial for software. " + NOT_CLONED[1]],
  },
  sequence: {
    level: "partial",
    family: ["Điền phần còn thiếu của dãy", "Complete-the-pattern"],
    approximation: ["Một hàng ô với một ô trống; điền số hoặc chọn hình còn thiếu.", "A row of cards with one empty slot; type the number or pick the missing shape."],
    limits: ["Hình trong dãy là hình học đơn giản, chưa dùng tranh vật thể. " + NOT_CLONED[0], "The pattern uses plain shapes, not pictured objects. " + NOT_CLONED[1]],
  },
  memory: {
    level: "partial",
    family: ["Nhớ rồi gọi lại", "Remember-then-recall"],
    approximation: ["Bắt đầu, xem ngắn, nội dung ẩn đi, rồi gọi lại theo thứ tự hoặc vị trí.", "Start, a brief look, the content hides, then recall it in order or by place."],
    limits: ["Chưa có hiệu ứng lật thẻ; hình là hình học đơn giản. " + NOT_CLONED[0], "No card-flip effect; the shapes are plain. " + NOT_CLONED[1]],
  },
  audio: {
    level: "partial",
    family: ["Nghe rồi gõ lại", "Listen-and-type"],
    approximation: ["Nhấn Phát, nghe dãy chữ số (có thể có tiếng ồn nền), phát lại, gõ và xác minh.", "Press Play, hear a digit sequence (optionally over background noise), replay, type, verify."],
    limits: ["Một giọng, chỉ chữ số. Không dùng micro hay nhận dạng giọng nói. " + NOT_CLONED[0], "One voice, digits only. No microphone and no speech recognition. " + NOT_CLONED[1]],
  },
  "proof-of-work": {
    level: "yes",
    family: ["Kiểm tra hệ thống bằng bằng chứng công việc", "Proof-of-work system check"],
    approximation: ["Một dòng trạng thái đang kiểm tra rồi “đã xong”; chi tiết kỹ thuật nằm trong một mục thu gọn.", "A checking status that ends in done; the technical details sit in a collapsed section."],
    limits: ["Không chứng minh người dùng là con người; chạy trên luồng chính theo từng lát nhỏ. " + NOT_CLONED[0], "It does not prove a human user; it runs on the main thread in small slices. " + NOT_CLONED[1]],
  },
  "proof-of-space": {
    level: "yes",
    family: ["Kiểm tra hệ thống bằng bằng chứng không gian", "Proof-of-space system check"],
    approximation: ["Một dòng trạng thái đang chuẩn bị rồi “đã xong”; kích thước vùng nhớ nằm trong chi tiết kỹ thuật.", "A preparing status that ends in done; the memory size sits in the technical details."],
    limits: ["Là mô phỏng nhỏ (tối đa 4 MB), không phải giao thức lưu trữ thật. " + NOT_CLONED[0], "A small simulation (at most 4 MB), not a real storage-hard protocol. " + NOT_CLONED[1]],
  },
  "match-key": {
    level: "yes",
    family: ["Ghép với thẻ mẫu", "Match-the-key cards"],
    approximation: ["Một thẻ mẫu và 4 đến 6 thẻ vật thể; chọn thẻ cùng vật thể, màu và hướng quay.", "A key card and 4 to 6 object cards; pick the one with the same object, colour and turn."],
    limits: NOT_CLONED,
  },
  "tile-game": {
    level: "yes",
    family: ["Trò chơi ô nhỏ", "Tile mini-game"],
    approximation: ["Tìm cặp vật thể giống nhau, hoặc các ô cùng một thuộc tính với ô mẫu.", "Find the matching pair of objects, or the tiles that share one attribute with the reference tile."],
    limits: NOT_CLONED,
  },
  "browser-capability": {
    level: "yes",
    family: ["Kiểm tra môi trường trình duyệt", "Browser environment check"],
    approximation: ["Một dòng “các khả năng cần thiết đều có”; danh sách có/không nằm bên dưới.", "A “required capabilities available” line; the yes/no list sits below."],
    limits: ["Chỉ có/không, không đo hiệu năng, không lấy dấu vân tay. " + NOT_CLONED[0], "Yes or no only: no performance measurement and no fingerprint. " + NOT_CLONED[1]],
  },
};

export function realismFor(id: PluginId, t: Translate): { level: RealismLevel; family: string; approximation: string; limits: string } {
  const r = R[id];
  return { level: r.level, family: t(r.family[0], r.family[1]), approximation: t(r.approximation[0], r.approximation[1]), limits: t(r.limits[0], r.limits[1]) };
}

export const realismLevelOf = (id: PluginId): RealismLevel => R[id].level;
