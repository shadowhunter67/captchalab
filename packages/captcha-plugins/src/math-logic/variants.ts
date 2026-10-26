import { type CaptchaVariantSet } from "@captchalab/captcha-core";

export interface MathVariantConfig {
  [key: string]: number | string;
  /** Operators that may appear, e.g. "+, -" or "+, -, x" (display text; the generator reads `steps` and the id). */
  operations: string;
  /** Largest operand of an addition or subtraction. (Factors of a multiplication stay small.) */
  operandMax: number;
  /** Operations in an arithmetic expression (1 or 2); for comparison, 0 = plain integers, 1 = one operation per side. */
  steps: number;
  /** Comparison only: how far apart the two values are, smallest and largest. 0 for arithmetic. */
  minGap: number;
  maxGap: number;
}

export const MATH_LOGIC_VARIANTS: CaptchaVariantSet<MathVariantConfig> = {
  variants: [
    {
      id: "arithmetic",
      name: "Arithmetic",
      description: "Work out a sum, difference or product; the hardest level has two steps.",
      difficulties: {
        easy: { operations: "+, -", operandMax: 20, steps: 1, minGap: 0, maxGap: 0 },
        medium: { operations: "+, -, x", operandMax: 25, steps: 1, minGap: 0, maxGap: 0 },
        hard: { operations: "+, -, x", operandMax: 20, steps: 2, minGap: 0, maxGap: 0 },
      },
    },
    {
      id: "comparison",
      name: "Comparison",
      description: "Two values side by side: type the larger one. Closer values and expressions are harder.",
      difficulties: {
        easy: { operations: "none", operandMax: 50, steps: 0, minGap: 10, maxGap: 25 },
        medium: { operations: "none", operandMax: 99, steps: 0, minGap: 1, maxGap: 5 },
        hard: { operations: "+, -, x", operandMax: 20, steps: 1, minGap: 1, maxGap: 10 },
      },
    },
  ],
  defaultSelection: { variantId: "arithmetic", difficulty: "medium" },
};
