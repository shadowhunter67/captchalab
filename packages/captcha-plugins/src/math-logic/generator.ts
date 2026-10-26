import { assertRange, resolveVariant, type GenerateContext } from "@captchalab/captcha-core";
import { evalExpr, num, op } from "./expr";
import type { MathChallenge, MathExpr } from "./types";
import { MATH_LOGIC_VARIANTS, type MathVariantConfig } from "./variants";

type Rng = () => number;
const int = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

/** One operation. "x" factors stay small so a product is still easy to do in your head. */
function oneStep(rng: Rng, ops: readonly ("+" | "-" | "*")[], operandMax: number): MathExpr {
  const o = ops[Math.floor(rng() * ops.length)] as "+" | "-" | "*";
  if (o === "*") return op("*", num(int(rng, 2, 12)), num(int(rng, 2, 9)));
  let a = int(rng, 1, operandMax);
  let b = int(rng, 1, operandMax);
  if (o === "-" && b > a) [a, b] = [b, a];
  return op(o, num(a), num(b));
}

/** Two operations, written so operator precedence matters: (a + b) x c, or a x b + c. */
function twoSteps(rng: Rng, operandMax: number): MathExpr {
  const sign = rng() < 0.5 ? "+" : "-";
  if (rng() < 0.5) {
    let a = int(rng, 1, operandMax);
    const b = int(rng, 1, operandMax);
    if (sign === "-" && b >= a) a = b + int(rng, 1, 5); // a - b stays positive
    return op("*", op(sign, num(a), num(b)), num(int(rng, 2, 5)));
  }
  const product = op("*", num(int(rng, 2, 9)), num(int(rng, 2, 9)));
  const c = int(rng, 1, Math.min(operandMax, (evalExpr(product) ?? operandMax + 1) - 1)); // the result stays positive
  return op(sign, product, num(c));
}

function comparisonPair(rng: Rng, config: MathVariantConfig): [MathExpr, MathExpr] {
  if (config.steps === 0) {
    const x = int(rng, 1, config.operandMax);
    const gap = int(rng, config.minGap, config.maxGap);
    const y = x + gap <= config.operandMax ? x + gap : x - gap;
    if (y < 1) throw new RangeError("comparison operands do not fit the range");
    return [num(x), num(y)];
  }
  for (let tries = 0; tries < 300; tries++) {
    const a = oneStep(rng, ["+", "-", "*"], config.operandMax);
    const b = oneStep(rng, ["+", "-", "*"], config.operandMax);
    const gap = Math.abs((evalExpr(a) ?? 0) - (evalExpr(b) ?? 0));
    if (gap >= config.minGap && gap <= config.maxGap) return [a, b];
  }
  throw new RangeError("could not build a comparison inside the gap range");
}

/** Same seed + variant + difficulty, same challenge. The answer is always computed from the tree. */
export function generateMathChallenge({ rng, variantId, difficulty }: GenerateContext): MathChallenge {
  const { variant, config, challengeConfig } = resolveVariant(MATH_LOGIC_VARIANTS, { variantId, difficulty });
  assertRange("math operand maximum", config.operandMax, 5, 99);
  assertRange("math steps", config.steps, 0, 2);
  assertRange("math minimum gap", config.minGap, 0, 50);
  assertRange("math maximum gap", config.maxGap, config.minGap, 50);

  let challenge: Omit<MathChallenge, "id">;
  if (variant.id === "comparison") {
    const [first, second] = comparisonPair(rng, config);
    const swap = rng() < 0.5;
    const left = swap ? second : first;
    const right = swap ? first : second;
    const larger = Math.max(evalExpr(left) as number, evalExpr(right) as number);
    challenge = { kind: "comparison", expr: left, other: right, expectedAnswer: larger, config: challengeConfig };
  } else {
    const ops = config.operations.includes("x") ? (["+", "-", "*"] as const) : (["+", "-"] as const);
    const expr = config.steps >= 2 ? twoSteps(rng, config.operandMax) : oneStep(rng, ops, config.operandMax);
    challenge = { kind: "arithmetic", expr, expectedAnswer: evalExpr(expr) as number, config: challengeConfig };
  }
  const id = `math-logic-${Math.floor(rng() * 0x100000000).toString(16).padStart(8, "0")}`;
  return { id, ...challenge };
}
