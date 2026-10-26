import type { Translate } from "@/lib/i18n";

/**
 * Vietnamese for the English `reason` strings returned by the CAPTCHA verifiers
 * (packages/captcha-plugins/src/<plugin>/verifier.ts). Keys are the exact English text.
 */
export const REASON_VI: Readonly<Record<string, string>> = {
  // Shared
  "The challenge is missing or malformed.": "Thử thách bị thiếu hoặc không hợp lệ.",
  // Checkbox
  "The answer must state whether the box is checked.": "Câu trả lời phải cho biết ô có được đánh dấu hay không.",
  "The checkbox was left checked, as the challenge requires.": "Ô đánh dấu được để ở trạng thái đã chọn, đúng như thử thách yêu cầu.",
  "The checkbox was left unchecked.": "Ô đánh dấu bị để ở trạng thái chưa chọn.",
  // Drag & drop
  "The challenge or answer could not be read.": "Không đọc được thử thách hoặc câu trả lời.",
  "The challenge is malformed (items).": "Thử thách không hợp lệ (các món đồ).",
  "The challenge is malformed (targets).": "Thử thách không hợp lệ (các đích).",
  "The challenge is malformed (target mapping).": "Thử thách không hợp lệ (việc ghép đích).",
  "The challenge is malformed (every item needs one target).": "Thử thách không hợp lệ (mỗi món đồ cần đúng một đích).",
  "The answer must state where each item was placed.": "Câu trả lời phải cho biết từng món đồ được đặt ở đâu.",
  "The answer mentions an item that is not in this challenge.": "Câu trả lời nhắc đến một món đồ không có trong thử thách này.",
  "The answer is missing an item.": "Câu trả lời thiếu một món đồ.",
  "The answer uses an unknown drop target.": "Câu trả lời dùng một vùng thả không tồn tại.",
  "Two items cannot rest on the same drop target.": "Hai món đồ không thể nằm trên cùng một vùng thả.",
  "Every item is on its matching target.": "Mọi món đồ đều nằm đúng đích của nó.",
  "Some items are not on a target yet.": "Một số món đồ chưa nằm trên đích nào.",
  "Some items are on the wrong target.": "Một số món đồ nằm sai đích.",
  // Image grid
  "The answer must be a list of cell ids.": "Câu trả lời phải là danh sách mã các ô.",
  "The answer mentions a cell that is not in this grid.": "Câu trả lời nhắc đến một ô không có trong lưới này.",
  "Every matching image is selected and nothing else.": "Mọi ảnh phù hợp đều đã được chọn và không chọn thừa ảnh nào.",
  "Some matching images are missing and some selected images do not match.": "Còn thiếu một số ảnh phù hợp và có một số ảnh được chọn không phù hợp.",
  "Some matching images are not selected.": "Một số ảnh phù hợp chưa được chọn.",
  "Some selected images do not match.": "Một số ảnh được chọn không phù hợp.",
  // Shape matching, math / logic, sequence
  "The answer must map each shape to a target.": "Câu trả lời phải ghép mỗi hình với một đích.",
  "The answer mentions a shape or target that is not on this board.": "Câu trả lời nhắc đến một hình hoặc đích không có trên bảng này.",
  "Every shape is matched to its own target.": "Mọi hình đều được ghép đúng với đích của nó.",
  "Some shapes are not matched yet.": "Một số hình chưa được ghép.",
  "Some shapes are matched to the wrong target.": "Một số hình được ghép sai đích.",
  "Some shapes are not matched and some are matched to the wrong target.": "Một số hình chưa được ghép và một số được ghép sai đích.",
  "The answer must be a whole number and nothing else.": "Câu trả lời phải là một số nguyên và không có gì khác.",
  "The answer is correct.": "Câu trả lời đúng.",
  "The answer is not correct.": "Câu trả lời chưa đúng.",
  "The answer must be a whole number.": "Câu trả lời phải là một số nguyên.",
  "The missing number is correct.": "Số còn thiếu đúng.",
  "The missing number is not correct.": "Số còn thiếu chưa đúng.",
  "The answer must be one of the options.": "Câu trả lời phải là một trong các lựa chọn.",
  "The answer is not one of the options.": "Câu trả lời không nằm trong các lựa chọn.",
  "The missing shape is correct.": "Hình còn thiếu đúng.",
  "The missing shape is not correct.": "Hình còn thiếu chưa đúng.",
  // Image rotation
  "The answer must be a finite angle in degrees.": "Câu trả lời phải là một góc xác định, tính bằng độ.",
  "The object is upright within the accepted tolerance.": "Vật đã thẳng đứng, trong mức sai lệch cho phép.",
  "The object is not upright enough yet.": "Vật vẫn chưa đủ thẳng đứng.",
  // Slider
  "The challenge is malformed (target and tolerance must be finite numbers in [0, 1]).":
    "Thử thách không hợp lệ (đích và mức sai lệch phải là số xác định trong khoảng [0, 1]).",
  "Answer position must be a finite number between 0 and 1.": "Vị trí trả lời phải là một số xác định từ 0 đến 1.",
  "The handle was released within the accepted tolerance of the target.": "Tay nắm được thả trong mức sai lệch cho phép so với đích.",
  "The handle was released outside the accepted tolerance of the target.": "Tay nắm được thả ngoài mức sai lệch cho phép so với đích.",
  // Text
  "The answer must be text.": "Câu trả lời phải là văn bản.",
  "The text matches (case does not matter).": "Văn bản khớp (không phân biệt chữ hoa, chữ thường).",
  "The text does not match.": "Văn bản không khớp.",
};

/** Verifier reason in the current language; unknown reasons stay in English. */
export function translateReason(reason: string, t: Translate): string {
  const vi = REASON_VI[reason];
  return vi === undefined ? reason : t(vi, reason);
}
