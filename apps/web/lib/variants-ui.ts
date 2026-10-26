import type { CaptchaDifficulty, ChallengeConfig, ParameterValue } from "@captchalab/captcha-core";
import type { Translate } from "@/lib/i18n";

/**
 * How variants, difficulty levels and their parameters are named and written in the UI. The numbers come from the
 * generated challenge's own `config.parameters`, so what is shown is what was actually applied.
 */

export type CaptchaKey = "slider" | "checkbox" | "drag-drop" | "rotation" | "text" | "image-grid";

export const difficultyLabel = (d: CaptchaDifficulty, t: Translate): string =>
  d === "easy" ? t("Dễ", "Easy") : d === "medium" ? t("Vừa", "Medium") : t("Khó", "Hard");

const VARIANT_NAMES: Record<string, [vi: string, en: string]> = {
  "slider:classic": ["Cổ điển", "Classic"],
  "slider:precision": ["Chính xác", "Precision"],
  "checkbox:basic": ["Cơ bản", "Basic"],
  "drag-drop:shape-match": ["Ghép hình", "Shape match"],
  "rotation:classic": ["Cổ điển", "Classic"],
  "rotation:offset-start": ["Lệch góc ban đầu", "Offset start"],
  "text:clean": ["Sạch", "Clean"],
  "text:rotated": ["Xoay chữ", "Rotated"],
  "text:noisy": ["Nhiễu", "Noisy"],
  "image-grid:basic-shapes": ["Hình cơ bản", "Basic shapes"],
  "image-grid:similar-shapes": ["Hình giống nhau", "Similar shapes"],
};

const VARIANT_DESCRIPTIONS: Record<string, [vi: string, en: string]> = {
  "slider:classic": ["Thanh trượt quen thuộc; độ khó thu hẹp vùng thả được chấp nhận.", "The usual slider; difficulty narrows the accepted release window."],
  "slider:precision": ["Vùng đích hẹp ngay từ đầu; độ khó làm nó hẹp hơn nữa.", "A narrow target from the start; difficulty makes it narrower still."],
  "checkbox:basic": ["Một ô đánh dấu gốc. Chỉ có một mức: độ khó không áp dụng cho ô đánh dấu.", "A single native checkbox. One level only: difficulty does not apply to a checkbox."],
  "drag-drop:shape-match": ["Ba hình vào đúng vùng; độ khó làm hình và vùng thả nhỏ lại.", "Three shapes onto their matching areas; difficulty shrinks the shapes and the drop areas."],
  "rotation:classic": ["Góc bắt đầu bất kỳ; độ khó thu hẹp góc được chấp nhận.", "Any starting angle; difficulty narrows the accepted angle."],
  "rotation:offset-start": ["Cùng dung sai, nhưng vật bắt đầu xa vị trí thẳng đứng hơn khi độ khó tăng.", "The same tolerance, but the object starts further from upright as difficulty rises."],
  "text:clean": ["Ít méo: chữ gần như không xoay và ít nhiễu.", "Minimal distortion: characters barely move and there is little noise."],
  "text:rotated": ["Mỗi chữ được xoay và dịch riêng.", "Each character is turned and shifted on its own."],
  "text:noisy": ["Xoay nhẹ, nhiều đường ngẫu nhiên cắt qua chữ.", "Mild rotation with many random lines crossing the text."],
  "image-grid:basic-shapes": ["Bốn hình khác nhau rõ rệt; độ khó tăng số ô khớp.", "Four clearly different shapes; difficulty raises how many cells match."],
  "image-grid:similar-shapes": ["Các cặp hình trông giống nhau (tròn và bầu dục, vuông và vuông bo góc) làm nhiễu.", "Pairs that look alike (circle and oval, square and rounded square) act as distractors."],
};

export function variantName(captcha: CaptchaKey, variantId: string, fallback: string, t: Translate): string {
  const pair = VARIANT_NAMES[`${captcha}:${variantId}`];
  return pair ? t(...pair) : fallback;
}

export function variantDescription(captcha: CaptchaKey, variantId: string, fallback: string, t: Translate): string {
  const pair = VARIANT_DESCRIPTIONS[`${captcha}:${variantId}`];
  return pair ? t(...pair) : fallback;
}

export interface ConfigRow {
  id: string;
  label: string;
  value: string;
}

const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`;
const num = (v: ParameterValue | undefined): number => (typeof v === "number" ? v : Number.NaN);

const FAMILY_TEXT: Record<string, [vi: string, en: string]> = {
  basic: ["hình tròn, vuông, tam giác, ngôi sao", "circle, square, triangle, star"],
  similar: ["hình tròn, bầu dục, vuông, vuông bo góc", "circle, oval, square, rounded square"],
};

/** Parameter rows for the "Challenge configuration" block. Unknown keys fall back to `key: value`. */
export function parameterRows(captcha: CaptchaKey, p: Readonly<Record<string, ParameterValue>>, t: Translate): ConfigRow[] {
  switch (captcha) {
    case "slider":
      return [{ id: "tolerance", label: t("Dung sai thả", "Release tolerance"), value: `±${pct(num(p.tolerance))} ${t("quãng trượt", "of the travel")}` }];
    case "rotation":
      return [
        { id: "toleranceDeg", label: t("Dung sai góc", "Angle tolerance"), value: `±${num(p.toleranceDeg)}°` },
        { id: "start", label: t("Lệch ban đầu", "Starting displacement"), value: `${num(p.minInitialDeg)}°–${num(p.maxInitialDeg)}°` },
        { id: "randomSide", label: t("Bên bắt đầu", "Starting side"), value: p.randomSide ? t("ngẫu nhiên", "random") : t("theo góc bất kỳ", "any angle") },
      ];
    case "drag-drop":
      return [
        { id: "itemSize", label: t("Cỡ hình", "Shape size"), value: pct(num(p.itemSize)) },
        { id: "dropTolerance", label: t("Bán kính vùng thả", "Drop-area radius"), value: pct(num(p.dropTolerance)) },
      ];
    case "text":
      return [
        { id: "length", label: t("Số ký tự", "Characters"), value: String(num(p.length)) },
        { id: "rotationDeg", label: t("Xoay mỗi chữ", "Rotation"), value: `±${num(p.rotationDeg)}°` },
        { id: "shift", label: t("Dịch dọc", "Vertical shift"), value: `±${pct(num(p.shift))}` },
        { id: "noiseLines", label: t("Số đường nhiễu", "Noise elements"), value: String(num(p.noiseLines)) },
      ];
    case "image-grid": {
      const fam = FAMILY_TEXT[String(p.family)];
      return [
        { id: "targets", label: t("Số ô khớp", "Matching cells"), value: `${num(p.targetMin)}–${num(p.targetMax)} / 9` },
        { id: "family", label: t("Bộ hình", "Shape set"), value: fam ? t(...fam) : String(p.family) },
      ];
    }
    case "checkbox":
      return [{ id: "activation", label: t("Cách kích hoạt", "Activation"), value: p.activation === "single press" ? t("một lần bấm", "single press") : String(p.activation) }];
  }
}

/** Everything the "Challenge configuration" block shows, as plain rows. */
export function describeConfig(
  captcha: CaptchaKey,
  captchaName: string,
  config: ChallengeConfig,
  variantFallback: string,
  t: Translate,
): ConfigRow[] {
  const rows: ConfigRow[] = [
    { id: "captcha", label: "CAPTCHA", value: captchaName },
    { id: "variant", label: t("Biến thể", "Variant"), value: variantName(captcha, config.variantId, variantFallback, t) },
    { id: "difficulty", label: t("Độ khó", "Difficulty"), value: difficultyLabel(config.difficulty, t) },
  ];
  if (config.seed !== undefined) rows.push({ id: "seed", label: "Seed", value: config.seed });
  return [...rows, ...parameterRows(captcha, config.parameters, t)];
}
