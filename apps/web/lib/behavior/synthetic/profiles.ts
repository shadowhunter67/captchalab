import { EN, type Translate } from "@/lib/i18n";
import type { BehaviorCaptchaId } from "../types";

export interface ProfileDef {
  id: string;
  label: string;
  labelVi: string;
  description: string;
  descriptionVi: string;
  /** Uses the synthetic seed for randomness; the others ignore it. */
  random: boolean;
}

const p = (id: string, label: string, labelVi: string, description: string, descriptionVi: string, random = false): ProfileDef => ({
  id, label, labelVi, description, descriptionVi, random,
});

/**
 * Synthetic profiles per CAPTCHA. A profile is a recipe for GENERATED interaction data on a CaptchaLab challenge
 * (no DOM event, no third-party site). Not every CAPTCHA has every profile.
 */
export const PROFILES_BY_CAPTCHA: Readonly<Record<BehaviorCaptchaId, readonly ProfileDef[]>> = {
  slider: [
    p("linear", "Linear", "Tuyến tính", "Constant speed in a straight line, regular sample times.", "Tốc độ không đổi theo đường thẳng, các mẫu cách đều nhau."),
    p("eased", "Eased", "Mượt dần", "Speed follows an ease-in-out curve, regular sample times, straight line.", "Tốc độ theo đường cong chậm - nhanh - chậm, mẫu cách đều nhau, đường thẳng."),
    p("noisy", "Noisy", "Có nhiễu", "Eased, then a small overshoot is corrected; position jitter and uneven sample times.", "Mượt dần, rồi vượt nhẹ quá đích và chỉnh lại; vị trí rung nhẹ và thời gian giữa các mẫu không đều.", true),
    p("stop-and-correct", "Stop-and-correct", "Dừng rồi chỉnh", "Eased to about 70% of the way, pauses, then goes past the target and comes back.", "Kéo mượt tới khoảng 70%, dừng lại, rồi đi quá đích và quay về."),
  ],
  "drag-drop": [
    p("direct", "Direct", "Thẳng", "Each item moves in a straight line at constant speed; every drag takes the same time.", "Mỗi vật đi thẳng với tốc độ không đổi; mọi lần kéo mất cùng một thời gian."),
    p("eased", "Eased", "Mượt dần", "Straight paths with an ease-in-out speed curve.", "Đường đi thẳng với tốc độ chậm - nhanh - chậm."),
    p("noisy", "Noisy", "Có nhiễu", "Curved, jittery paths with uneven sample times and different durations per drag.", "Đường cong, rung nhẹ, thời gian giữa các mẫu không đều và mỗi lần kéo một thời lượng.", true),
  ],
  checkbox: [
    p("immediate", "Immediate", "Ngay lập tức", "Activates almost at once and releases right away.", "Kích hoạt gần như ngay và nhả ra liền."),
    p("delayed", "Delayed", "Trễ", "Waits a variable time, then holds the press a variable time.", "Chờ một lúc không cố định rồi giữ lần nhấn một lúc không cố định.", true),
    p("regular-timing", "Regular timing", "Nhịp đều", "Activates three times at exactly equal intervals with equal holds.", "Kích hoạt ba lần ở những khoảng cách đều tuyệt đối với thời gian giữ bằng nhau."),
  ],
  "image-grid": [
    p("immediate", "Immediate selections", "Chọn ngay", "Selects every matching tile almost at once, in quick succession.", "Chọn mọi ô khớp gần như ngay, liên tiếp rất nhanh."),
    p("uniform-interval", "Uniform interval", "Khoảng đều", "Selects the matching tiles at exactly equal intervals.", "Chọn các ô khớp ở những khoảng cách đều tuyệt đối."),
    p("variable-interval", "Variable interval", "Khoảng thay đổi", "Uneven pauses between selections, with one deselection.", "Khoảng dừng không đều giữa các lần chọn, kèm một lần bỏ chọn.", true),
  ],
  text: [
    p("uniform-typing", "Uniform typing", "Gõ đều", "Types the answer with exactly equal gaps between keys.", "Gõ đáp án với khoảng cách giữa các phím đều tuyệt đối."),
    p("variable-typing", "Variable typing", "Gõ thay đổi", "Types with uneven gaps and key hold times.", "Gõ với khoảng cách giữa các phím và thời gian giữ phím không đều.", true),
    p("correction-typing", "Correction typing", "Gõ có sửa", "Uneven typing with one wrong key that is deleted and retyped.", "Gõ không đều, có một phím sai được xoá rồi gõ lại.", true),
  ],
  "shape-matching": [
    p("immediate", "Immediate", "Ngay lập tức", "Pairs every shape almost at once, in quick succession.", "Ghép mọi hình gần như ngay, liên tiếp rất nhanh."),
    p("uniform-interval", "Uniform interval", "Khoảng đều", "Presses at exactly equal intervals.", "Nhấn ở những khoảng cách đều tuyệt đối."),
    p("variable-interval", "Variable interval", "Khoảng thay đổi", "Uneven pauses, with one wrong pairing that is replaced.", "Khoảng dừng không đều, kèm một lần ghép sai rồi thay lại.", true),
  ],
  "math-logic": [
    p("uniform-typing", "Uniform typing", "Gõ đều", "Types the answer with exactly equal gaps between keys.", "Gõ đáp án với khoảng cách giữa các phím đều tuyệt đối."),
    p("variable-typing", "Variable typing", "Gõ thay đổi", "Types with uneven gaps and key hold times.", "Gõ với khoảng cách giữa các phím và thời gian giữ phím không đều.", true),
    p("correction-typing", "Correction typing", "Gõ có sửa", "Uneven typing with one wrong key that is deleted and retyped.", "Gõ không đều, có một phím sai được xoá rồi gõ lại.", true),
  ],
  sequence: [
    p("immediate", "Immediate", "Ngay lập tức", "Answers almost at once, with fast, equal key or click gaps.", "Trả lời gần như ngay, các phím hoặc lần bấm cách nhau ngắn và bằng nhau."),
    p("uniform-timing", "Uniform timing", "Nhịp đều", "A steady start and exactly equal gaps.", "Bắt đầu đều và các khoảng cách bằng nhau tuyệt đối."),
    p("variable-timing", "Variable timing", "Nhịp thay đổi", "Uneven gaps; the visual variant picks a wrong option first and changes it.", "Khoảng cách không đều; biến thể hình chọn sai một đáp án rồi đổi.", true),
  ],
  memory: [
    p("immediate", "Immediate recall", "Nhớ lại ngay", "Starts recalling the moment the preview ends and recalls in quick succession.", "Bắt đầu nhớ lại ngay khi hết phần xem trước và nhớ liên tiếp rất nhanh."),
    p("uniform-interval", "Uniform interval", "Khoảng đều", "Recalls at exactly equal intervals.", "Nhớ lại ở những khoảng cách đều tuyệt đối."),
    p("variable-interval", "Variable interval", "Khoảng thay đổi", "Uneven pauses, with one wrong pick that is taken back.", "Khoảng dừng không đều, kèm một lựa chọn sai được thu hồi.", true),
  ],
  audio: [
    p("uniform-typing", "Uniform typing", "Gõ đều", "Plays once, then types with exactly equal gaps between keys.", "Phát một lần rồi gõ với khoảng cách giữa các phím đều tuyệt đối."),
    p("variable-typing", "Variable typing", "Gõ thay đổi", "Plays, replays once, then types with uneven gaps.", "Phát, phát lại một lần rồi gõ với khoảng cách không đều.", true),
    p("correction-typing", "Correction typing", "Gõ có sửa", "Plays, replays, then types with one wrong key deleted and retyped.", "Phát, phát lại rồi gõ có một phím sai được xoá và gõ lại.", true),
  ],
  rotation: [
    p("direct", "Direct rotation", "Xoay thẳng", "Turns at constant angular speed straight to upright.", "Xoay với tốc độ góc không đổi thẳng tới vị trí đứng."),
    p("eased", "Eased rotation", "Xoay mượt dần", "Turns with a slow-fast-slow angular speed.", "Xoay với tốc độ góc chậm - nhanh - chậm."),
    p("overshoot-correct", "Overshoot-and-correct", "Xoay quá rồi chỉnh", "Turns past upright and then back.", "Xoay quá vị trí đứng rồi quay lại.", true),
  ],
};

export function profilesFor(captchaId: BehaviorCaptchaId): readonly ProfileDef[] {
  return PROFILES_BY_CAPTCHA[captchaId];
}

export function profileDef(captchaId: BehaviorCaptchaId, id: string): ProfileDef | undefined {
  return PROFILES_BY_CAPTCHA[captchaId].find((d) => d.id === id);
}

export const profileName = (captchaId: BehaviorCaptchaId, id: string, t: Translate = EN): string => {
  const d = profileDef(captchaId, id);
  return d ? t(d.labelVi, d.label) : id;
};

export const profileText = (captchaId: BehaviorCaptchaId, id: string, t: Translate = EN): string => {
  const d = profileDef(captchaId, id);
  return d ? t(d.descriptionVi, d.description) : "";
};

export function defaultProfile(captchaId: BehaviorCaptchaId): string {
  return (PROFILES_BY_CAPTCHA[captchaId][1] ?? PROFILES_BY_CAPTCHA[captchaId][0]!).id;
}
