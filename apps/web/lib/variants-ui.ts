import type { CaptchaDifficulty, ChallengeConfig, ParameterValue } from "@captchalab/captcha-core";
import type { Translate } from "@/lib/i18n";

/**
 * How variants, difficulty levels and their parameters are named and written in the UI. The numbers come from the
 * generated challenge's own `config.parameters`, so what is shown is what was actually applied.
 */

export type CaptchaKey = "slider" | "checkbox" | "drag-drop" | "rotation" | "text" | "image-grid" | "shape-matching" | "math-logic" | "sequence";

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
  "shape-matching:exact": ["Hình y hệt", "Exact shape"],
  "shape-matching:pattern": ["Ghép theo cấu trúc", "Pattern match"],
  "math-logic:arithmetic": ["Tính toán", "Arithmetic"],
  "math-logic:comparison": ["So sánh", "Comparison"],
  "sequence:number": ["Dãy số", "Number"],
  "sequence:visual": ["Dãy hình", "Visual"],
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
  "shape-matching:exact": ["Mỗi hình nguồn có một bản sao giống hệt trong các đích; độ khó thêm cặp và hình na ná nhau.", "Each source has an identical twin among the targets; difficulty adds pairs and look-alikes."],
  "shape-matching:pattern": ["Các đích là cùng hình nhưng bị xoay, chỉ có viền hoặc đổi cỡ: ghép theo cấu trúc, không theo vẻ ngoài.", "Targets show the same shape turned, outlined or resized: match by structure, not by looks."],
  "math-logic:arithmetic": ["Tính một tổng, hiệu hoặc tích; mức khó nhất có hai bước.", "Work out a sum, difference or product; the hardest level has two steps."],
  "math-logic:comparison": ["Hai giá trị cạnh nhau: gõ giá trị lớn hơn. Giá trị gần nhau và biểu thức thì khó hơn.", "Two values side by side: type the larger one. Closer values and expressions are harder."],
  "sequence:number": ["Tìm số còn thiếu: bước đều, rồi nhân hoặc bước xen kẽ, rồi hai quy tắc cùng lúc.", "Find the missing number: a steady step, then multiplication or alternating steps, then two rules at once."],
  "sequence:visual": ["Tìm hình còn thiếu trong một mẫu lặp; đơn vị lặp càng dài càng khó.", "Find the missing shape in a repeating pattern; longer units are harder."],
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


const SEQUENCE_PATTERNS: Record<string, [vi: string, en: string]> = {
  arithmetic: ["cộng một bước đều", "steady step"],
  geometric: ["nhân", "multiplying"],
  alternating: ["hai bước xen kẽ", "alternating steps"],
  interleaved: ["hai quy tắc xen kẽ", "two interleaved rules"],
  "geometric, alternating": ["nhân hoặc hai bước xen kẽ", "multiplying or alternating steps"],
  "two interleaved rules": ["hai quy tắc xen kẽ", "two interleaved rules"],
};

function sequencePattern(value: string, t: Translate): string {
  const pair = SEQUENCE_PATTERNS[value];
  if (pair) return t(...pair);
  return /^[A-D]{2,4}$/.test(value) ? value : t(`đơn vị lặp ${value}`, `unit of ${value}`);
}

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
    case "shape-matching":
      return [
        { id: "pairs", label: t("Số cặp", "Pairs"), value: String(num(p.pairs)) },
        { id: "similarity", label: t("Độ giống của các hình nhiễu", "Distractor similarity"), value: p.similarity === "low" ? t("thấp", "Low") : p.similarity === "medium" ? t("vừa", "Medium") : t("cao", "High") },
        { id: "rotationDeg", label: t("Xoay đích", "Target rotation"), value: num(p.rotationDeg) > 0 ? `0–${num(p.rotationDeg)}°` : t("không", "none") },
        { id: "mixedFill", label: t("Đích chỉ có viền", "Outlined targets"), value: p.mixedFill ? t("có thể", "possible") : t("không", "no") },
        { id: "sizeVariation", label: t("Đổi cỡ đích", "Target size change"), value: num(p.sizeVariation) > 0 ? `±${pct(num(p.sizeVariation))}` : t("không", "none") },
      ];
    case "math-logic":
      return [
        { id: "operations", label: t("Phép toán", "Operations"), value: p.operations === "none" ? t("không (số nguyên)", "none (plain integers)") : String(p.operations).replace(/-/g, "\u2212").replace(/x/g, "\u00d7") },
        { id: "operandMax", label: t("Số hạng lớn nhất", "Operand range"), value: `1–${num(p.operandMax)}` },
        { id: "steps", label: t("Số bước", "Steps"), value: String(num(p.steps)) },
        ...(num(p.maxGap) > 0 ? [{ id: "gap", label: t("Khoảng cách hai giá trị", "Gap between values"), value: `${num(p.minGap)}–${num(p.maxGap)}` }] : []),
      ];
    case "sequence":
      return [
        { id: "length", label: t("Độ dài", "Length"), value: String(num(p.length)) },
        { id: "pattern", label: t("Kiểu quy luật", "Pattern type"), value: sequencePattern(String(p.pattern ?? p.patterns), t) },
        ...(num(p.options) > 0 ? [{ id: "options", label: t("Số lựa chọn", "Options"), value: String(num(p.options)) }] : []),
      ];
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
